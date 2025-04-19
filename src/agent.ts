// src/agent.ts
import {
  AgentConfig,
  Message,
  ModelResponse,
  ParsedToolCall,
  AssistantToolCall,
  Logger,
  PromptHooks,
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
  private logger: Logger;
  private hooks: PromptHooks;

  constructor(config: AgentConfig) {
    this.config = config;

    // Set up injectable logger and hooks
    this.logger = config.logger ?? console;
    this.hooks = config.hooks ?? {};

    // Initialize model service
    this.modelService = new ModelService({
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
    });

    // Initialize managers
    this.promptManager = new PromptManager(config.basePrompt);
    this.toolManager = new ToolManager(config.tools ?? []);
    this.workflowManager = new WorkflowManager(config.workflowSteps ?? []);

    // Update model service with tool definitions
    this.updateModelServiceTools();

    // Add initial system message
    this.messages.push({
      role: "system",
      content: this.promptManager.getSystemPrompt(),
    });
  }

  private updateModelServiceTools(): void {
    const defs = this.toolManager.getToolDefinitionsForAPI();
    this.modelService.setTools(defs);
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

    // Hook before sending
    this.hooks.beforePrompt?.(this.messages);

    // Call LLM
    const response: ModelResponse = await this.modelService.generateResponse(
      this.messages
    );

    // Hook after receiving
    this.hooks.afterResponse?.(response);

    // If tool calls are present, handle them
    if (response.parsedToolCalls && response.parsedToolCalls.length > 0) {
      await this.handleToolCalls(
        response.rawToolCalls ?? [],
        response.parsedToolCalls
      );

      // Follow-up response
      const followUp: ModelResponse = await this.modelService.generateResponse(
        this.messages
      );
      this.hooks.afterResponse?.(followUp);

      this.messages.push({
        role: "assistant",
        content: safeContent(followUp.content),
      });

      return safeContent(followUp.content);
    }

    // Normal assistant response
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
    // Record the raw tool call message
    this.messages.push({
      role: "assistant",
      content: null,
      tool_calls: rawToolCalls,
    });

    // Execute tools in parallel
    await Promise.all(
      parsedToolCalls.map(async (toolCall) => {
        try {
          const res = await this.toolManager.executeTool(
            toolCall.name,
            toolCall.arguments
          );
          this.messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: safeContent(res),
          });
        } catch (error) {
          this.logger.error(`Error executing tool ${toolCall.name}:`, error);
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
    return this.workflowManager.executeWorkflow(this, workflowName, input);
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public clearConversation(): void {
    // Keep only the system message
    this.messages = [this.messages[0]];
  }

  public updateBasePrompt(newPrompt: string): void {
    this.promptManager.updateBasePrompt(newPrompt);
    if (this.messages.length && this.messages[0].role === "system") {
      this.messages[0].content = this.promptManager.getSystemPrompt();
    }
  }
}
