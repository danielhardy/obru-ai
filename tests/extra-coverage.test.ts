// tests/extra-coverage.test.ts

import { safeContent } from "../src/utils";
import { WorkflowManager } from "../src/workflow-manager";
import { Agent } from "../src/agent";
import { ToolManager } from "../src/tool-manager";
import type { WorkflowStep, Tool } from "../src/types";

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("safeContent utility", () => {
  it("returns empty string for null or undefined", () => {
    expect(safeContent(null)).toBe("");
    expect(safeContent(undefined)).toBe("");
  });

  it("returns the original string when defined", () => {
    expect(safeContent("hello")).toBe("hello");
  });
});

describe("WorkflowManager additional coverage", () => {
  const dummyAgent = {} as Agent;

  it("unregisters a workflow step", () => {
    const step: WorkflowStep = {
      name: "s",
      description: "",
      execute: jest.fn(),
    };
    const wm = new WorkflowManager([step]);
    expect(wm.getWorkflowStep("s")).toBe(step);
    expect(wm.unregisterWorkflowStep("s")).toBe(true);
    expect(wm.getWorkflowStep("s")).toBeUndefined();
  });

  it("lists all registered steps", () => {
    const s1: WorkflowStep = { name: "a", description: "", execute: jest.fn() };
    const s2: WorkflowStep = { name: "b", description: "", execute: jest.fn() };
    const wm = new WorkflowManager([s1, s2]);
    expect(wm.getAllWorkflowSteps()).toEqual(expect.arrayContaining([s1, s2]));
  });

  it("throws when executing an unknown workflow", async () => {
    const wm = new WorkflowManager();
    await expect(wm.executeWorkflow(dummyAgent, "none", "x")).rejects.toThrow(
      /not found/i
    );
  });

  it("handles errors thrown in a workflow step", async () => {
    const broken: WorkflowStep = {
      name: "fail",
      description: "",
      execute: jest.fn().mockRejectedValue(new Error("boom")),
    };
    const wm = new WorkflowManager();
    wm.registerWorkflowStep(broken);
    await expect(
      wm.executeWorkflow(dummyAgent, "fail", "input")
    ).rejects.toThrow(/Failed to execute workflow "fail": boom/);
  });
});

describe("ToolManager error branch", () => {
  it("throws when the tool.execute method rejects", async () => {
    const badTool: Tool = {
      name: "bad",
      description: "Always fails",
      parameters: { type: "object", properties: {} },
      execute: async () => {
        throw new Error("boom");
      },
    };
    const tm = new ToolManager([badTool]);
    await expect(tm.executeTool("bad", {})).rejects.toThrow(
      /Failed to execute tool "bad": boom/
    );
  });
});
