// src/prompt-manager.ts
export class PromptManager {
  private basePrompt: string;
  private toolDescriptions: string = "";

  constructor(basePrompt: string) {
    this.basePrompt = basePrompt;
  }

  public addToolDescription(description: string): void {
    this.toolDescriptions += `\n${description}`;
  }

  public getSystemPrompt(): string {
    let systemPrompt = this.basePrompt;

    if (this.toolDescriptions) {
      systemPrompt += `\n\nYou have access to the following tools:\n${this.toolDescriptions}`;
    }

    return systemPrompt;
  }

  public updateBasePrompt(newPrompt: string): void {
    this.basePrompt = newPrompt;
  }

  public clearToolDescriptions(): void {
    this.toolDescriptions = "";
  }
}
