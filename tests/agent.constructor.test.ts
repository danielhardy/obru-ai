// tests/agent.constructor.test.ts

describe("Agent constructor and nullish defaults", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("uses initial config.tools when provided", async () => {
    // Spy on setTools to see what's passed
    const setTools = jest.fn();
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools,
        generateResponse: jest.fn().mockResolvedValue({ content: "x" }),
      })),
    }));

    const { Agent } = await import("../src/agent");
    const dummyTool = {
      name: "t",
      description: "desc",
      parameters: { type: "object" as const, properties: {} },
      async execute() {
        return "val";
      },
    } satisfies import("../src/types").Tool;

    new Agent({
      apiKey: "key",
      model: "m",
      basePrompt: "bp",
      tools: [dummyTool],
    });

    expect(setTools).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "function",
          function: expect.objectContaining({ name: "t", description: "desc" }),
        }),
      ])
    );
  });

  it("pushes an initial system message", async () => {
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest.fn().mockResolvedValue({ content: "y" }),
      })),
    }));

    const { Agent } = await import("../src/agent");
    const agent = new Agent({ apiKey: "k", model: "m", basePrompt: "hello" });

    expect(agent.getMessages()).toEqual([{ role: "system", content: "hello" }]);
  });

  it("registers initial workflowSteps and executes them", async () => {
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation(() => ({
        setTools: jest.fn(),
        generateResponse: jest.fn().mockResolvedValue({ content: "z" }),
      })),
    }));

    const { Agent } = await import("../src/agent");
    const step = {
      name: "echo",
      description: "",
      async execute(self: any, input: string) {
        return input.toUpperCase();
      },
    } satisfies import("../src/types").WorkflowStep;

    const agent = new Agent({
      apiKey: "k",
      model: "m",
      basePrompt: "bp",
      workflowSteps: [step],
    });

    const result = await agent.executeWorkflow("echo", "test");
    expect(result).toBe("TEST");
  });

  it("respects explicit temperature and maxTokens", async () => {
    let captured: any;
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation((cfg) => {
        captured = cfg;
        return { setTools: jest.fn(), generateResponse: jest.fn() };
      }),
    }));

    const { Agent } = await import("../src/agent");
    new Agent({
      apiKey: "k",
      model: "m",
      basePrompt: "bp",
      temperature: 0.2,
      maxTokens: 55,
    });

    expect(captured.temperature).toBe(0.2);
    expect(captured.maxTokens).toBe(55);
  });

  it("falls back to default temperature and maxTokens when omitted", async () => {
    let captured: any;
    jest.doMock("../src/model-service", () => ({
      ModelService: jest.fn().mockImplementation((cfg) => {
        captured = cfg;
        return { setTools: jest.fn(), generateResponse: jest.fn() };
      }),
    }));

    const { Agent } = await import("../src/agent");
    new Agent({ apiKey: "k", model: "m", basePrompt: "bp" });

    expect(captured.temperature).toBe(0.7);
    expect(captured.maxTokens).toBe(1000);
  });
});
