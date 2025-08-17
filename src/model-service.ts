// src/model-service.ts
import {
  Message,
  ModelResponse,
  ModelServiceConfig,
  ParsedToolCall,
  AssistantToolCall,
  Tool,
  APITool,
} from "./types.ts";

export class ModelService {
  private config: ModelServiceConfig;
  private tools: APITool[] = [];
  private readonly baseUrl: string;

  constructor(config: ModelServiceConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
  }

  public setTools(tools: APITool[]): void {
    this.tools = tools;
  }

  public async generateResponse(messages: Message[]): Promise<ModelResponse> {
    try {
      const requestBody: {
        model: string;
        messages: Message[];
        temperature: number;
        // max_completion_tokens: number;
        tools?: APITool[];
        tool_choice?: string;
      } = {
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        // max_completion_tokens: this.config.maxTokens,
      };

      // Include tools if any are registered
      if (this.tools.length > 0) {
        requestBody.tools = this.tools;
        requestBody.tool_choice = "auto";
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();

      const content = data.choices[0].message.content || "";
      // Parse tool calls, capturing the ID
      const rawToolCalls: AssistantToolCall[] | undefined =
        data.choices[0].message.tool_calls;
      const parsedToolCalls: ParsedToolCall[] =
        rawToolCalls?.map((call: AssistantToolCall) => ({
          id: call.id, // Capture the tool call ID
          name: call.function.name,
          arguments:
            typeof call.function.arguments === "string"
              ? JSON.parse(call.function.arguments) // Parse arguments if they are a string
              : call.function.arguments, // Otherwise, assume they are already an object (less common)
        })) || [];

      // Return content and the *parsed* tool calls with IDs
      // Return content, raw tool calls (for history), and parsed tool calls (for execution)
      return {
        content,
        rawToolCalls: rawToolCalls,
        parsedToolCalls: parsedToolCalls,
      };
    } catch (error) {
      console.error("Error calling API:", error);
      throw new Error(
        `Failed to generate response from the model: ${
          (error as Error).message
        }`
      );
    }
  }

  public formatToolsForAPI(tools: Tool[]): APITool[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
