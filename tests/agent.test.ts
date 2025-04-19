/**
 * We mock ModelService so no HTTP requests are made.
 * Each generateResponse call returns a canned reply.
 */
jest.mock("../src/model-service", () => {
  return {
    ModelService: jest.fn().mockImplementation(() => ({
      setTools: jest.fn(),
      generateResponse: jest
        .fn()
        // 1st call: echo the user
        .mockResolvedValueOnce({ content: "pong" })
        // 2nd call (if tools executed): no tool calls in this simple case
        .mockResolvedValue({ content: "follow‑up" }),
    })),
  };
});

import { Agent } from "../src/agent";

describe("Agent.processInput", () => {
  const agent = new Agent({
    basePrompt: "You are a test agent.",
    model: "gpt-4o-mini",
    apiKey: "sk-test",
  });

  it("stores conversation history and returns assistant response", async () => {
    const reply = await agent.processInput("ping");
    expect(reply).toBe("pong");
    const history = agent.getMessages();
    expect(history).toHaveLength(3); // system, user, assistant
    expect(history[1].role).toBe("user");
    expect(history[2].content).toBe("pong");
  });

  it("can clear the conversation but keep the system prompt", () => {
    agent.clearConversation();
    const history = agent.getMessages();
    expect(history).toHaveLength(1);
    expect(history[0].role).toBe("system");
  });
});
