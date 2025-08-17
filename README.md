# obru‑ai

A TypeScript library for creating AI agents with custom tools and workflows. This toolkit makes it easy to build AI‑powered applications that can execute tasks, follow workflows, and integrate with external systems.

## Features

- 🧠 **AI Agent Orchestration**: Manage conversations with LLMs like OpenAI's GPT models
- 🛠️ **Tool Integration**: Define and execute custom tools that your agent can use
- 🔄 **Workflow System**: Create multi‑step workflows with reusable components
- 🔌 **Express.js Integration**: Ready to use with web applications
- 📋 **Lifecycle Hooks**: Inspect or mutate prompts & responses without forking
- 🪵 **Injectable Logger**: Plug in Winston, Pino, or a silent no‑op logger
- 🦕 **Deno Compatible**: Full support for Deno runtime with JSR registry publishing

## Installation

### Node.js

> **Prerequisite**: **Node 18 or later**. obru‑ai relies on the built‑in `fetch`; no external HTTP client (e.g. Axios) is required.

```bash
npm install github:danielhardy/obru-ai
```

### Deno

```bash
# From JSR (recommended)
deno add @obru/ai

# Or import directly
import { Agent } from "https://deno.land/x/obru_ai/src/index.ts";
```

## Quick Start

### Node.js Usage

```typescript
import { Agent } from "obru-ai";

// Create an agent
const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.processInput("Hello, can you help me?");
console.log(response);
```

### Deno Usage

```typescript
import { Agent } from "@obru/ai";

// Create an agent (using Deno.env for environment variables)
const agent = new Agent({
  basePrompt: "You are a helpful AI assistant running in Deno.",
  model: "gpt-4",
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
  tools: [
    {
      name: "getDenoVersion",
      description: "Gets the current Deno version",
      parameters: { type: "object", properties: {} },
      execute: async () => Deno.version.deno,
    },
  ],
});

const response = await agent.processInput("What version of Deno am I running?");
console.log(response);
```

Run with:
```bash
deno run --allow-net --allow-env your-script.ts
```

> Need structured logging or metrics? Pass `logger` and `hooks` in the config—see _Advanced Configuration_.

### With Custom Tools

```typescript
import { Agent } from "obru-ai";

const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [
    {
      name: "getCurrentTime",
      description: "Gets the current time",
      parameters: { type: "object", properties: {} },
      execute: async () => new Date().toISOString(),
    },
  ],
});

const response = await agent.processInput("What time is it now?");
console.log(response);
```

### With Workflows

```typescript
import { Agent } from "obru-ai";

const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
  workflowSteps: [
    {
      name: "analyzeAndRespond",
      description: "Analyze input and provide a thoughtful response",
      execute: async (agent, input) => {
        const analysis = await agent.processInput(`Analyze this: ${input}`);
        return agent.processInput(
          `Respond based on this analysis: ${analysis}`
        );
      },
    },
  ],
});

const response = await agent.executeWorkflow(
  "analyzeAndRespond",
  "How do neural networks work?"
);
console.log(response);
```

## Express.js Integration

```typescript
import express from "express";
import { Agent } from "obru-ai";

const app = express();
app.use(express.json());

const agent = new Agent({
  basePrompt: "You are a customer support AI.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await agent.processInput(message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## API Reference

### Agent

The core class for creating and managing AI agents.

#### Constructor

```typescript
new Agent(config: AgentConfig)
```

#### AgentConfig

```typescript
interface AgentConfig {
  apiKey: string;
  model: string;
  basePrompt: string;
  tools?: Tool[];
  workflowSteps?: WorkflowStep[];
  /**
   * Replace console with any logger that implements
   * `error`, and optionally `info`, `warn`, `debug`.
   *
   * Examples: `console`, `winston.createLogger()`, `pino()`
   */
  logger?: Logger;
  /**
   * Lifecycle hooks that fire around each LLM request.
   */
  hooks?: {
    /** Called just *before* modelService.generateResponse */
    beforePrompt?(messages: Message[]): void;
    /** Called immediately *after* the raw ModelResponse returns */
    afterResponse?(response: ModelResponse): void;
  };
  /** Controls model randomness (0–1). Default: 0.7 */
  temperature?: number;
  /** Maximum tokens in the reply. Default: 1000 */
  maxTokens?: number;
  /** Custom API base URL. Default: "https://api.openai.com/v1" */
  baseUrl?: string;
}
```

#### Logger Interface

```typescript
interface Logger {
  error(message?: any, ...optional: any[]): void;
  info?(message?: any, ...optional: any[]): void;
  warn?(message?: any, ...optional: any[]): void;
  debug?(message?: any, ...optional: any[]): void;
}
```

#### Methods

- `processInput(input: string): Promise<string>` – Process user input and return agent response
- `executeWorkflow(workflowName: string, input: string): Promise<string>` – Execute a defined workflow
- `registerTool(tool: Tool): void` – Register a new tool dynamically
- `registerWorkflowStep(step: WorkflowStep): void` – Register a new workflow step
- `getMessages(): Message[]` – Get the conversation history
- `clearConversation(): void` – Clear conversation history (keeps system prompt)
- `updateBasePrompt(newPrompt: string): void` – Update the base system prompt

### Tool Interface

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: Record<string, any>) => Promise<string>;
}
```

### WorkflowStep Interface

```typescript
interface WorkflowStep {
  name: string;
  description: string;
  execute: (agent: Agent, input: string) => Promise<string>;
}
```

### Utilities

```typescript
import { safeContent } from "obru-ai";

/**
 * Ensures content is always a string, converting `null` or `undefined`
 * to an empty string.
 */
const safe = safeContent(null); // ""
```

## Advanced Configuration

```typescript
import { Agent } from "obru-ai";

const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY!,
  temperature: 0.5,
  maxTokens: 2000,
  logger: console, // swap for winston/pino as needed
  hooks: {
    beforePrompt: (msgs) => {
      console.debug("Sending messages:", msgs);
    },
    afterResponse: (resp) => {
      console.debug("Model responded with:", resp.content);
    },
  },
  tools: [
    /* ... */
  ],
  workflowSteps: [
    /* ... */
  ],
});
```

## Using Custom API Endpoints

You can configure obru-ai to work with any OpenAI-compatible API by setting the `baseUrl` option:

```typescript
import { Agent } from "obru-ai";

// Using OpenRouter
const openRouterAgent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "anthropic/claude-3-haiku",
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseUrl: "https://openrouter.ai/api/v1",
});

// Using Azure OpenAI
const azureAgent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.AZURE_API_KEY!,
  baseUrl: "https://your-resource.openai.azure.com/openai/deployments/your-deployment/v1",
});

// Using local LM Studio
const localAgent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "local-model",
  apiKey: "not-needed", // LM Studio doesn't require API key
  baseUrl: "http://localhost:1234/v1",
});
```

> **Note:** Any API that follows the OpenAI chat completions format will work with obru-ai.

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

`MIT`
