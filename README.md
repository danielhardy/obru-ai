# obru-ai

A TypeScript library for creating AI agents with custom tools and workflows. This toolkit makes it easy to build AI-powered applications that can execute tasks, follow workflows, and integrate with external systems.

## Features

- 🧠 **AI Agent Orchestration**: Manage conversations with LLMs like OpenAI's GPT models
- 🛠️ **Tool Integration**: Define and execute custom tools that your agent can use
- 🔄 **Workflow System**: Create multi-step workflows with reusable components
- 🔌 **Express.js Integration**: Ready to use with web applications
- 📝 **Conversation History**: Full conversation management and context tracking

## Installation

```bash
npm install github:danielhardy/obru-ai
```

## Quick Start

### Basic Usage

```typescript
import { Agent } from "obru-ai";

// Create an agent
const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY,
});

// Process user input
const response = await agent.processInput("Hello, can you help me?");
console.log(response);
```

### With Custom Tools

```typescript
import { Agent } from "obru-ai";

const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY,
  tools: [
    {
      name: "getCurrentTime",
      description: "Gets the current time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        return new Date().toISOString();
      },
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
  apiKey: process.env.OPENAI_API_KEY,
  workflowSteps: [
    {
      name: "analyzeAndRespond",
      description: "Analyze input and provide a thoughtful response",
      execute: async (agent, input) => {
        const analysis = await agent.processInput(`Analyze this: ${input}`);
        return await agent.processInput(
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
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await agent.processInput(message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

#### Methods

- `processInput(input: string): Promise<string>` - Process user input and return agent response
- `executeWorkflow(workflowName: string, input: string): Promise<string>` - Execute a defined workflow
- `registerTool(tool: Tool): void` - Register a new tool dynamically
- `registerWorkflowStep(step: WorkflowStep): void` - Register a new workflow step
- `getMessages(): Message[]` - Get the conversation history
- `clearConversation(): void` - Clear conversation history (keeps system prompt)
- `updateBasePrompt(newPrompt: string): void` - Update the base system prompt

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

## Advanced Configuration

```typescript
import { Agent } from 'obru-ai';

// Using OpenAI (default)
const agent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.5,  // Controls randomness (0-1)
  maxTokens: 2000,   // Maximum response length
  tools: [...],
  workflowSteps: [...]
});

// Using OpenRouter
const routerAgent = new Agent({
  basePrompt: "You are a helpful AI assistant.",
  model: "anthropic/claude-2", // OpenRouter model path
  apiKey: process.env.OPENROUTER_API_KEY,
  temperature: 0.5,
  maxTokens: 2000,
  provider: "openrouter", // Specify OpenRouter as the provider
  apiBaseUrl: "https://openrouter.ai/api/v1", // Optional: override the default URL
  tools: [...], // Tool/function calling is now supported on OpenRouter!
});
```

OpenRouter now supports tool/function calling (see [OpenRouter Tool Calling Docs](https://openrouter.ai/docs/features/tool-calling)). You can use the same tools array as with OpenAI.

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

MIT
