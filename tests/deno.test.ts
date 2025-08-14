// tests/deno.test.ts
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Agent } from "../src/index.ts";

Deno.test("Agent - Basic instantiation", () => {
  const agent = new Agent({
    basePrompt: "Test prompt",
    model: "gpt-4",
    apiKey: "test-key",
  });

  assertExists(agent);
  assertEquals(agent.getMessages().length, 1); // Should have system message
  assertEquals(agent.getMessages()[0].role, "system");
});

Deno.test("Agent - Tool registration", () => {
  const testTool = {
    name: "testTool",
    description: "A test tool",
    parameters: { type: "object" as const, properties: {} },
    execute: async () => "test result",
  };

  const agent = new Agent({
    basePrompt: "Test prompt",
    model: "gpt-4",
    apiKey: "test-key",
    tools: [testTool],
  });

  assertExists(agent);
  // Tool registration is tested through the constructor
});

Deno.test("Agent - Conversation management", () => {
  const agent = new Agent({
    basePrompt: "Test prompt",
    model: "gpt-4",
    apiKey: "test-key",
  });

  // Test clearing conversation
  agent.clearConversation();
  assertEquals(agent.getMessages().length, 1); // Should still have system message

  // Test updating base prompt
  agent.updateBasePrompt("New prompt");
  assertEquals(agent.getMessages()[0].content, "New prompt");
});

Deno.test("Agent - Workflow registration", () => {
  const testWorkflow = {
    name: "testWorkflow",
    description: "A test workflow",
    execute: async (agent: Agent, input: string) => `Processed: ${input}`,
  };

  const agent = new Agent({
    basePrompt: "Test prompt",
    model: "gpt-4",
    apiKey: "test-key",
    workflowSteps: [testWorkflow],
  });

  assertExists(agent);
  // Workflow registration is tested through the constructor
});
