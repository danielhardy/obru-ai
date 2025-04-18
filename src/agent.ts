// src/agent.ts
import {
  AgentConfig,
  Message,
  ModelResponse,
  ParsedToolCall,
  AssistantToolCall,
} from "./types";
import { ModelService } from "./model-service";
import { PromptManager } from "./prompt-manager";
import { ToolManager } from "./tool-manager";
import { WorkflowManager } from "./workflow-manager";
import { safeContent } from "./utils";

export class Agent {
  private config: AgentConfig;
  private messages: Message[] = [];
  private modelService: ModelService;
  private promptManager: PromptManager;
  private toolManager: ToolManager;
  private workflowManager: WorkflowManager;

  constructor(config: AgentConfig) {
    this.config = config;

    this.modelService = new ModelService({
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
    });

    this.promptManager = new PromptManager(config.basePrompt);
    this.toolManager = new ToolManager(config.tools || []);
    this.workflowManager = new WorkflowManager(config.workflowSteps || []);

    // Update model service with tool definitions
    this.updateModelServiceTools();

    // Add system message
    this.messages.push({
      role: "system",
      content: this.promptManager.getSystemPrompt(),
    });
  }

  private updateModelServiceTools(): void {
    const toolDefinitions = this.toolManager.getToolDefinitionsForAPI();
    this.modelService.setTools(toolDefinitions);
  }

  public registerTool(tool: any): void {
    this.toolManager.registerTool(tool);
    this.updateModelServiceTools();
  }

  public registerWorkflowStep(step: any): void {
    this.workflowManager.registerWorkflowStep(step);
  }

  public async processInput(input: string): Promise<string> {
    // Add user message
    this.messages.push({ role: "user", content: safeContent(input) });

    // Get response from LLM
    const response = await this.modelService.generateResponse(this.messages);

    // If the response contains parsed tool calls, execute them
    if (response.parsedToolCalls && response.parsedToolCalls.length > 0) {
      // Pass both raw (for history) and parsed (for execution) tool calls
      await this.handleToolCalls(
        response.rawToolCalls || [],
        response.parsedToolCalls
      );

      // Get follow-up response after tool execution
      const followUpResponse = await this.modelService.generateResponse(
        this.messages
      );
      this.messages.push({
        role: "assistant",
        content: safeContent(followUpResponse.content),
      });

      return safeContent(followUpResponse.content);
    }

    // Add assistant response to messages
    this.messages.push({
      role: "assistant",
      content: safeContent(response.content),
    });
    return safeContent(response.content);
  }

  private async handleToolCalls(
    rawToolCalls: AssistantToolCall[],
    parsedToolCalls: ParsedToolCall[]
  ): Promise<void> {
    // Add the assistant message containing the raw tool calls to history
    this.messages.push({
      role: "assistant",
      content: null, // per OpenAI spec when tool_calls are present
      tool_calls: rawToolCalls,
    });

    // Execute all parsed tool calls **in parallel**
    await Promise.all(
      parsedToolCalls.map(async (toolCall) => {
        try {
          const toolResponse = await this.toolManager.executeTool(
            toolCall.name,
            toolCall.arguments
          );

          this.messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: safeContent(toolResponse),
          });
        } catch (error) {
          console.error(`Error executing tool ${toolCall.name}:`, error);
          this.messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: `Error executing tool ${toolCall.name}: ${
              (error as Error).message
            }`,
          });
        }
      })
    );
  }

  public async executeWorkflow(
    workflowName: string,
    input: string
  ): Promise<string> {
    return await this.workflowManager.executeWorkflow(
      this,
      workflowName,
      input
    );
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public clearConversation(): void {
    // Keep the system message only
    this.messages = [this.messages[0]];
  }

  public updateBasePrompt(newPrompt: string): void {
    this.promptManager.updateBasePrompt(newPrompt);

    // Update the system message
    if (this.messages.length > 0 && this.messages[0].role === "system") {
      this.messages[0].content = this.promptManager.getSystemPrompt();
    }
  }
}
