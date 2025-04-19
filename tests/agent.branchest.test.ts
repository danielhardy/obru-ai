// tests/agent.branches.test.ts
import type { Tool } from "../src/types";

describe("Agent – uncovered branches", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("executes a tool successfully and pushes the tool response", async () => {
    // 1) Stub ModelService: first call returns a tool call, second returns final reply
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest
          .fn()
          .mockResolvedValueOnce({
            content: null,
            rawToolCalls: [
              { id: "1", name: "echo", arguments: { msg: "xyz" } },
            ],
            parsedToolCalls: [
              { id: "1", name: "echo", arguments: { msg: "xyz" } },
            ],
          })
          .mockResolvedValueOnce({ content: "final" }),
      })),
    }));

    const { Agent } = await import("../src/agent");
    const agent = new Agent({
      apiKey: "key",
      model: "m",
      basePrompt: "bp",
      tools: [],
    });

    // 2) Register a tool that returns a custom string
    const echoTool: Tool = {
      name: "echo",
      description: "echoes text",
      parameters: { type: "object", properties: { msg: { type: "string" } } },
      async execute(args) {
        return "ECHO " + args.msg;
      },
    };
    agent.registerTool(echoTool);

    // 3) Run processInput; final reply is from the second mockResolvedValue
    const reply = await agent.processInput("anything");
    expect(reply).toBe("final");

    // 4) Inspect messages: there should be a 'tool' message with our echo output
    const msgs = agent.getMessages();
    const toolMsg = msgs.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg).toMatchObject({
      role: "tool",
      content: "ECHO xyz",
      name: "echo",
      tool_call_id: "1",
    });
  });

  it("silently skips hooks when none are provided", async () => {
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest.fn().mockResolvedValue({ content: "ok" }),
      })),
    }));
    const { Agent } = await import("../src/agent");

    // No hooks in config
    const agent = new Agent({ apiKey: "k", model: "m", basePrompt: "bp" });
    await expect(agent.processInput("hello")).resolves.toBe("ok");
    // If hooks were undefined, no exceptions should have occurred
  });

  it("invokes beforePrompt and afterResponse hooks exactly once each", async () => {
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest.fn().mockResolvedValue({ content: "hi" }),
      })),
    }));
    const hooks = {
      beforePrompt: jest.fn(),
      afterResponse: jest.fn(),
    };
    const { Agent } = await import("../src/agent");

    const agent = new Agent({
      apiKey: "k",
      model: "m",
      basePrompt: "bp",
      hooks,
    });

    const r = await agent.processInput("hey");
    expect(r).toBe("hi");

    // beforePrompt called *before* the LLM call
    expect(hooks.beforePrompt).toHaveBeenCalledTimes(1);
    expect(hooks.beforePrompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user", content: "hey" }),
      ])
    );

    // afterResponse called *immediately* after generateResponse
    expect(hooks.afterResponse).toHaveBeenCalledTimes(1);
    expect(hooks.afterResponse).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hi" })
    );
  });
});
