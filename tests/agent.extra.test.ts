// tests/agent.extra.test.ts

/**
 * Suppress console.error output during tests
 */
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

/**
 * Global mock for ModelService so no real HTTP calls are made
 */
jest.mock("../src/model-service", () => ({
  ModelService: jest.fn().mockImplementation(() => ({
    setTools: jest.fn(),
    generateResponse: jest.fn(),
  })),
}));

import { Agent } from "../src/agent";
import type { Tool } from "../src/types";

// -----------------------------------------------------------------------------
// Cover: updateBasePrompt, registerWorkflowStep + executeWorkflow
// -----------------------------------------------------------------------------

describe("Agent misc methods", () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      basePrompt: "Initial Prompt",
      model: "dummy",
      apiKey: "key",
    });
  });

  it("updateBasePrompt updates system message", () => {
    agent.updateBasePrompt("New System");
    const msgs = agent.getMessages();
    expect(msgs[0].content).toBe("New System");
  });

  it("executeWorkflow invokes a registered step", async () => {
    const upperStep = {
      name: "upper",
      description: "to uppercase",
      async execute(self: Agent, input: string) {
        return input.toUpperCase();
      },
    } satisfies import("../src/types").WorkflowStep;

    agent.registerWorkflowStep(upperStep);
    const out = await agent.executeWorkflow("upper", "abc");
    expect(out).toBe("ABC");
  });
});

// -----------------------------------------------------------------------------
// Cover: handleToolCalls rawToolCalls + parsedToolCalls + error branch
// -----------------------------------------------------------------------------

describe("Agent.processInput tool call error branch", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest
          .fn()
          // first: return both raw and parsed tool calls
          .mockResolvedValueOnce({
            content: null,
            rawToolCalls: [{ id: "1", name: "fail", arguments: { x: 1 } }],
            parsedToolCalls: [{ id: "1", name: "fail", arguments: { x: 1 } }],
          })
          // second: after handling tool, normal reply
          .mockResolvedValueOnce({ content: "recovered" }),
      })),
    }));
  });

  it("appends rawToolCalls, logs error, and returns follow-up content", async () => {
    const { Agent: AgentErr } = await import("../src/agent");
    const agentErr = new AgentErr({
      basePrompt: "bp",
      model: "m",
      apiKey: "k",
    });

    const badTool: Tool = {
      name: "fail",
      description: "always fails",
      parameters: { type: "object" as const, properties: {} },
      async execute() {
        throw new Error("boom");
      },
    };
    agentErr.registerTool(badTool);

    const result = await agentErr.processInput("do fail");
    expect(result).toBe("recovered");

    const msgs = agentErr.getMessages();
    // raw tool call entry
    expect(msgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "assistant",
          tool_calls: expect.any(Array),
        }),
      ])
    );
    // tool error entry should contain the full fallback message
    expect(msgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          content: expect.stringMatching(/Error executing tool fail: .*boom/),
        }),
      ])
    );
  });
});
