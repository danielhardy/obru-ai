// example/deno-example.ts
import { Agent } from "../src/index.ts";

// Basic usage example for Deno
const agent = new Agent({
  basePrompt: "You are a helpful AI assistant running in Deno.",
  model: "gpt-4",
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
  tools: [
    {
      name: "getCurrentTime",
      description: "Gets the current time in Deno",
      parameters: { type: "object", properties: {} },
      execute: async () => new Date().toISOString(),
    },
    {
      name: "getDenoVersion",
      description: "Gets the current Deno version",
      parameters: { type: "object", properties: {} },
      execute: async () => Deno.version.deno,
    },
  ],
});

// Example usage
async function main() {
  try {
    console.log("🦕 Deno AI Agent Example");
    console.log("========================");

    const response = await agent.processInput(
      "What time is it and what version of Deno am I running?"
    );

    console.log("Agent Response:", response);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  main();
}
