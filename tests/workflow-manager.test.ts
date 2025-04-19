import { WorkflowManager } from "../src/workflow-manager";

describe("WorkflowManager", () => {
  const step = {
    name: "uppercase",
    description: "Upper‑cases the input",
    // eslint-disable-next-line @typescript-eslint/require-await
    execute: async (_agent: any, input: string) => input.toUpperCase(),
  };

  it("registers and executes a workflow step", async () => {
    const wm = new WorkflowManager([step]);
    const result = await wm.executeWorkflow({} as any, "uppercase", "hello");
    expect(result).toBe("HELLO");
  });

  it("throws on missing step", async () => {
    const wm = new WorkflowManager();
    await expect(wm.executeWorkflow({} as any, "missing", "x")).rejects.toThrow(
      /not found/i
    );
  });
});
