// src/workflow-manager.ts
import { WorkflowStep } from "./types.ts";
import { Agent } from "./agent.ts";

export class WorkflowManager {
  private workflowSteps: Map<string, WorkflowStep> = new Map();

  constructor(initialSteps: WorkflowStep[] = []) {
    initialSteps.forEach((step) => this.registerWorkflowStep(step));
  }

  public registerWorkflowStep(step: WorkflowStep): void {
    this.workflowSteps.set(step.name, step);
  }

  public unregisterWorkflowStep(stepName: string): boolean {
    return this.workflowSteps.delete(stepName);
  }

  public getWorkflowStep(stepName: string): WorkflowStep | undefined {
    return this.workflowSteps.get(stepName);
  }

  public getAllWorkflowSteps(): WorkflowStep[] {
    return Array.from(this.workflowSteps.values());
  }

  public async executeWorkflow(
    agent: Agent,
    workflowName: string,
    input: string
  ): Promise<string> {
    const step = this.getWorkflowStep(workflowName);

    if (!step) {
      throw new Error(`Workflow step "${workflowName}" not found`);
    }

    try {
      return await step.execute(agent, input);
    } catch (error) {
      console.error(`Error executing workflow "${workflowName}":`, error);
      throw new Error(
        `Failed to execute workflow "${workflowName}": ${
          (error as Error).message
        }`
      );
    }
  }
}
