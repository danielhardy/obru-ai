// src/model-service.ts
import axios from "axios";
import {
  Message,
  ModelResponse,
  ModelServiceConfig,
  ParsedToolCall,
  AssistantToolCall,
} from "./types";

export class ModelService {
  private config: ModelServiceConfig;
  private tools: any[] = [];
  private readonly baseUrl: string;

  constructor(config: ModelServiceConfig) {
    this.config = config;
    this.baseUrl =
      config.apiBaseUrl ||
      (config.provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : "https://api.openai.com/v1");
  }

  public setTools(tools: any[]): void {
    this.tools = tools;
  }

  public async generateResponse(messages: Message[]): Promise<ModelResponse> {
    try {
      const requestBody: any = {
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      };

      // Include tools if any are registered (now for both OpenAI and OpenRouter)
      if (this.tools.length > 0) {
        requestBody.tools = this.tools;
        requestBody.tool_choice = "auto";
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Set appropriate authorization header based on provider
      if (this.config.provider === "openrouter") {
        headers["HTTP-Referer"] = "https://github.com/danielhardy/obru-ai"; // Replace with your actual site
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      } else {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestBody,
        { headers }
      );

      const content = response.data.choices[0].message.content || "";
      // Parse tool calls for both OpenAI and OpenRouter, capturing the ID
      const rawToolCalls: AssistantToolCall[] | undefined =
        response.data.choices[0].message.tool_calls;
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
      console.error(
        `Error calling ${this.config.provider || "OpenAI"} API:`,
        error
      );
      throw new Error(
        `Failed to generate response from the model: ${
          (error as Error).message
        }`
      );
    }
  }

  public formatToolsForAPI(tools: Record<string, any>[]): any[] {
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
