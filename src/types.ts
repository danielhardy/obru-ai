// src/types.ts

/** A minimal logger interface—any logger (console, Winston, Pino…) that implements this will work */
export interface Logger {
  error(message?: unknown, ...optionalParams: unknown[]): void;
  warn?(message?: unknown, ...optionalParams: unknown[]): void;
  info?(message?: unknown, ...optionalParams: unknown[]): void;
  debug?(message?: unknown, ...optionalParams: unknown[]): void;
}

/** Hooks called before sending prompts or after receiving a response */
export interface PromptHooks {
  /** Inspect or mutate messages just before the LLM call */
  beforePrompt?: (messages: Message[]) => void;
  /** Inspect the raw LLM response (including tool calls) */
  afterResponse?: (response: ModelResponse) => void;
}

export interface AgentConfig {
  apiKey: string;
  model: string;
  basePrompt: string;
  tools?: Tool[];
  workflowSteps?: WorkflowStep[];
  // ← inject optional logger + hooks
  logger?: Logger;
  hooks?: PromptHooks;
  temperature?: number;
  maxTokens?: number;
}

// Interface for the tool_calls array within an assistant message (as received from API)
export interface AssistantToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, unknown>; // Arguments from API can arrive as either a string or a parsed object
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
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<string>;
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
  arguments: Record<string, unknown>; // Parsed arguments
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

export interface APITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Forward reference for TypeScript
import { Agent } from "./agent.ts";
