// src/tool-manager.ts
import { Tool, APITool } from "./types.ts";

export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  constructor(initialTools: Tool[] = []) {
    initialTools.forEach((tool) => this.registerTool(tool));
  }

  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  public unregisterTool(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  public getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    const tool = this.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      console.error(`Error executing tool "${toolName}":`, error);
      throw new Error(
        `Failed to execute tool "${toolName}": ${(error as Error).message}`
      );
    }
  }

  public getToolDefinitionsForAPI(): APITool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
