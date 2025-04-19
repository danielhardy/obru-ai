// tests/agent.test.ts
import { Tool } from "../src/types";

// -----------------------------------------------------------------------------
// 1) Default mock: no network calls, simple “pong” then “follow‑up” replies
// -----------------------------------------------------------------------------
jest.mock("../src/model-service", () => ({
  ModelService: jest.fn().mockImplementation(() => ({
    setTools: jest.fn(),
    generateResponse: jest
      .fn()
      // 1st call: ping → “pong”
      .mockResolvedValueOnce({ content: "pong" })
      // 2nd+ calls: any follow‑up → “follow‑up”
      .mockResolvedValue({ content: "follow‑up" }),
  })),
}));

import { Agent } from "../src/agent";

describe("Agent.processInput (no tools)", () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      basePrompt: "You are a test agent.",
      model: "gpt-4o-mini",
      apiKey: "sk-test",
    });
  });

  it("returns the assistant's reply and records history", async () => {
    const reply = await agent.processInput("ping");
    expect(reply).toBe("pong");

    const history = agent.getMessages();
    expect(history).toHaveLength(3); // system, user, assistant
    expect(history[1].role).toBe("user");
    expect(history[2].content).toBe("pong");
  });

  it("can clear conversation but preserves system prompt", () => {
    agent.clearConversation();
    const history = agent.getMessages();
    expect(history).toEqual([
      { role: "system", content: "You are a test agent." },
    ]);
  });
});

// -----------------------------------------------------------------------------
// 2) Tool‑execution branch: stub ModelService to return a parsedToolCall
// -----------------------------------------------------------------------------
describe("Agent.processInput (with tools)", () => {
  // A trivial reverse tool whose execute signature matches `Tool.execute`
  const reverseTool = {
    name: "reverse",
    description: "Reverses text",
    parameters: {
      type: "object" as const,
      properties: { text: { type: "string" } },
    },
    async execute(args: Record<string, any>) {
      const text = args.text as string;
      return text.split("").reverse().join("");
    },
  } satisfies Tool;

  beforeEach(async () => {
    // Reset module cache so our new mock is used
    jest.resetModules();
    // Mock ModelService to first return a tool‑call, then a follow‑up reply
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest
          .fn()
          // 1st call: instruct the agent to call "reverse"
          .mockResolvedValueOnce({
            content: null,
            parsedToolCalls: [
              { id: "1", name: "reverse", arguments: { text: "abc" } },
            ],
          })
          // 2nd call: after the tool runs → "done"
          .mockResolvedValueOnce({ content: "done" }),
      })),
    }));
  });

  it("executes a tool call returned by the model and returns its result", async () => {
    // Re-import Agent so it picks up our doMock
    const { Agent: AgentWithTools } = await import("../src/agent");
    const agent2 = new AgentWithTools({
      basePrompt: "You are tests",
      model: "gpt",
      apiKey: "x",
    });

    // Use the public API to register our reverseTool
    agent2.registerTool(reverseTool);

    const result = await agent2.processInput("reverse this");
    expect(result).toBe("done");
  });
});
