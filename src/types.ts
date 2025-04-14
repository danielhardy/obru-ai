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

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
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

export interface ModelResponse {
  content: string;
  toolCalls?: {
    name: string;
    arguments: Record<string, any>;
  }[];
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
