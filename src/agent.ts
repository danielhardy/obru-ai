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
    this.messages.push({ role: "user", content: input });

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
        content: followUpResponse.content,
      });
      // Ensure content is returned, even if null (should be string according to Promise type)
      return followUpResponse.content || "";
    }

    // Add assistant response to messages (ensure content is not null)
    this.messages.push({ role: "assistant", content: response.content || "" });
    return response.content || "";
  }

  private async handleToolCalls(
    rawToolCalls: AssistantToolCall[],
    parsedToolCalls: ParsedToolCall[]
  ): Promise<void> {
    // First, add the assistant message containing the raw tool calls to the history
    // Content should be null or empty string when tool_calls are present
    this.messages.push({
      role: "assistant",
      content: null, // Per OpenAI spec, content is often null when tool_calls are present
      tool_calls: rawToolCalls,
    });

    // Execute each tool call
    // Execute each parsed tool call
    for (const toolCall of parsedToolCalls) {
      try {
        const toolResponse = await this.toolManager.executeTool(
          toolCall.name,
          toolCall.arguments
        );

        // Add tool response message with the corresponding tool_call_id
        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id, // Include the ID of the call being responded to
          name: toolCall.name, // Function name is helpful but optional in tool role message
          content: toolResponse ?? "", // Force fallback to empty string if null/undefined
        });
      } catch (error) {
        console.error(`Error executing tool ${toolCall.name}:`, error);
        // Add tool error message with the corresponding tool_call_id
        this.messages.push({
          role: "tool",
          tool_call_id: toolCall.id, // Include the ID of the call that failed
          name: toolCall.name,
          content: `Error executing tool ${toolCall.name}: ${
            (error as Error).message
          }`,
        });
      }
    }
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
