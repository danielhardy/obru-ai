// src/model-service.ts
import axios from "axios";
import { Message, ModelResponse, ModelServiceConfig } from "./types";

export class ModelService {
  private config: ModelServiceConfig;
  private tools: any[] = [];

  constructor(config: ModelServiceConfig) {
    this.config = config;
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

      // Only include tools if we have any registered
      if (this.tools.length > 0) {
        requestBody.tools = this.tools;
        requestBody.tool_choice = "auto";
      }

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      );

      const content = response.data.choices[0].message.content || "";
      const toolCalls: { name: string; arguments: Record<string, any> }[] =
        response.data.choices[0].message.tool_calls?.map(
          (call: { function: { name: string; arguments: string } }) => ({
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments),
          })
        ) || [];

      return { content, toolCalls };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      throw new Error("Failed to generate response from the model");
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
