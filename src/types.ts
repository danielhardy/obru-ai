// src/types.ts
export interface AgentConfig {
  basePrompt: string;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  workflowSteps?: WorkflowStep[];
}

// Interface for the tool_calls array within an assistant message (as received from API)
export interface AssistantToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // Arguments from API are stringified JSON
  };
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null; // Allow null content for assistant messages with tool calls
  name?: string; // For tool role, function name that was called
  tool_calls?: AssistantToolCall[]; // For assistant role message (raw tool calls from API)
  tool_call_id?: string; // For tool role message (specific call being responded to)
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: Record<string, any>) => Promise<string>;
}

export interface WorkflowStep {
  name: string;
  description: string;
  execute: (agent: Agent, input: string) => Promise<string>;
}

// Interface for the parsed tool call info used internally by the agent
export interface ParsedToolCall {
  id: string; // Added: The ID of the tool call
  name: string;
  arguments: Record<string, any>; // Parsed arguments
}

export interface ModelResponse {
  content: string | null; // Content can be null when tool calls are present
  parsedToolCalls?: ParsedToolCall[]; // Parsed tool calls with IDs and object arguments
  rawToolCalls?: AssistantToolCall[]; // Raw tool calls exactly as received from the API
}

export interface ModelServiceConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  provider?: "openai" | "openrouter";
  apiBaseUrl?: string;
}

// Forward reference for TypeScript
import { Agent } from "./agent";
