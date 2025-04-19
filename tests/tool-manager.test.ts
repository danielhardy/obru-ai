import { ToolManager } from "../src/tool-manager";
import type { Tool } from "../src/types";

const echoTool = {
  name: "echo",
  description: "returns the input",
  parameters: {
    type: "object",
    properties: { msg: { type: "string" } },
  },
  async execute({ msg }) {
    return `>> ${msg}`;
  },
} satisfies Tool;

describe("ToolManager", () => {
  it("registers and retrieves a tool", () => {
    const tm = new ToolManager();
    tm.registerTool(echoTool);
    expect(tm.getTool("echo")).toBe(echoTool);
    expect(tm.getAllTools()).toHaveLength(1);
  });

  it("unregisters a tool", () => {
    const tm = new ToolManager([echoTool]);
    expect(tm.unregisterTool("echo")).toBe(true);
    expect(tm.getTool("echo")).toBeUndefined();
  });

  it("executes a registered tool", async () => {
    const tm = new ToolManager([echoTool]);
    await expect(tm.executeTool("echo", { msg: "hi" })).resolves.toBe(">> hi");
  });

  it("throws on unknown tool", async () => {
    const tm = new ToolManager();
    await expect(tm.executeTool("nope", {})).rejects.toThrow(/not found/i);
  });

  it("formats tools for API", () => {
    const tm = new ToolManager([echoTool]);
    const defs = tm.getToolDefinitionsForAPI();
    expect(defs[0].function.name).toBe("echo");
  });
});
