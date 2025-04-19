import { PromptManager } from "../src/prompt-manager";

describe("PromptManager", () => {
  it("returns the base prompt when no tools are added", () => {
    const pm = new PromptManager("You are a test agent.");
    expect(pm.getSystemPrompt()).toBe("You are a test agent.");
  });

  it("appends tool descriptions to the system prompt", () => {
    const pm = new PromptManager("Base");
    pm.addToolDescription("Tool A — does X.");
    pm.addToolDescription("Tool B — does Y.");
    expect(pm.getSystemPrompt()).toBe(
      "Base\n\nYou have access to the following tools:\n\nTool A — does X.\nTool B — does Y."
    );
  });

  it("can update the base prompt", () => {
    const pm = new PromptManager("Old");
    pm.updateBasePrompt("New");
    expect(pm.getSystemPrompt().startsWith("New")).toBe(true);
  });

  it("clears tool descriptions", () => {
    const pm = new PromptManager("Base");
    pm.addToolDescription("Tool X");
    pm.clearToolDescriptions();
    expect(pm.getSystemPrompt()).toBe("Base");
  });
});
