import { GoogleGenAI } from "@google/genai";
import { db } from "../../../shared/database/index.ts";
import {
  portfolios,
  programs,
  projects,
  risksAndIssues,
  resources,
  resourceAllocations
} from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../../shared/infrastructure/errors.ts";

export class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      throw new Error("GEMINI_API_KEY environment variable is not configured on the server side");
    }
    return this.ai;
  }

  async analyzePortfolioHealth(portfolioId: string): Promise<any> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, portfolioId)).limit(1);
    if (!portfolio) throw new NotFoundError("Portfolio");

    // Fetch related programs and projects
    const relatedPrograms = await db.select().from(programs).where(eq(programs.portfolioId, portfolioId));
    const allProjects = await db.select().from(projects);

    const programIds = relatedPrograms.map((p) => p.id);
    const portfolioProjects = allProjects.filter((proj) => proj.programId && programIds.includes(proj.programId));

    const prompt = `
      You are an expert Enterprise Portfolio Director. Analyze the following portfolio health:
      Portfolio Name: ${portfolio.name}
      Description: ${portfolio.description}
      Budget: $${portfolio.budget || "Not Specified"}

      Programs Count: ${relatedPrograms.length}
      Projects Count: ${portfolioProjects.length}
      
      Projects Details:
      ${JSON.stringify(
        portfolioProjects.map((p) => ({
          name: p.name,
          budget: p.budget,
          actualCost: p.actualCost,
          health: p.health,
          healthScore: p.healthScore,
        })),
        null,
        2
      )}

      Provide an Executive Portfolio Health Analysis. Include:
      1. Overall Risk Level & Health score analysis
      2. Strategic recommendation for low-health projects
      3. Budget optimization opportunities
      Format the output in clean, scannable Markdown.
    `;

    const aiClient = this.getClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return {
      portfolioId,
      analysis: response.text,
    };
  }

  async predictProjectDelay(projectId: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const prompt = `
      You are an Enterprise Risk Architect. Predict potential schedule delays for this project:
      Project: ${project.name}
      Planned Duration: Start: ${project.startDate} to End: ${project.endDate}
      Budget: $${project.budget}
      Actual Cost so far: $${project.actualCost}
      Health Status: ${project.health} (Score: ${project.healthScore}/100)

      Analyze the timeline dates, budget ratios, and overall status.
      Calculate potential slippage probability (%) and estimate how many weeks of delay might occur.
      Provide 3 specific mitigation plans to keep it on track.
      Format the output in clean, structured Markdown.
    `;

    const aiClient = this.getClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return {
      projectId,
      delayPrediction: response.text,
    };
  }

  async forecastBudgetOverrun(projectId: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const prompt = `
      You are an Executive Financial Forecaster. Predict budget overruns for:
      Project Name: ${project.name}
      Budget (BAC): $${project.budget}
      Actual Cost spent so far (AC): $${project.actualCost}
      Health Score: ${project.healthScore}

      Analyze the Cost Burn rate. Estimate the EAC (Estimate At Completion) and highlight if a deficit is imminent.
      Format the response in clean Markdown with clear headings and bullet points.
    `;

    const aiClient = this.getClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return {
      projectId,
      budgetForecast: response.text,
    };
  }

  async recommendResourceAllocation(projectId: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const activeResources = await db.select().from(resources).where(eq(resources.status, "ACTIVE"));

    const prompt = `
      You are a Resource Management specialist. Recommend resource leveling and allocation for the project:
      Project Name: ${project.name}
      Current Health: ${project.health}

      Available Bench/Active Enterprise Resource Pool:
      ${JSON.stringify(
        activeResources.map((r) => ({ id: r.id, name: r.name, department: r.department, type: r.type })),
        null,
        2
      )}

      Advise on matching the best skills or headcount configurations. Recommend assignments to optimize completion.
      Format in clean Markdown.
    `;

    const aiClient = this.getClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return {
      projectId,
      recommendations: response.text,
    };
  }

  async detectRiskTrends(projectId: string): Promise<any> {
    const risks = await db.select().from(risksAndIssues).where(eq(risksAndIssues.projectId, projectId));

    const prompt = `
      You are a PMO Risk Director. Analyze active risk trends for Project ID: ${projectId}.
      Current Registered Risks & Issues:
      ${JSON.stringify(
        risks.map((r) => ({ title: r.title, type: r.type, status: r.status, priority: r.priority, probability: r.probability })),
        null,
        2
      )}

      Highlight the top 3 severe systemic risk patterns and recommend direct preventative steps.
      Format in clean Markdown.
    `;

    const aiClient = this.getClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return {
      projectId,
      riskTrendAnalysis: response.text,
    };
  }

  async generateWeeklyPMOReport(): Promise<any> {
    const allProjects = await db.select().from(projects);

    const prompt = `
      You are a Chief PMO Officer. Synthesize this week's executive enterprise portfolio status.
      Projects Pool:
      ${JSON.stringify(
        allProjects.map((p) => ({ name: p.name, status: p.status, health: p.health, budget: p.budget, actualCost: p.actualCost })),
        null,
        2
      )}

      Produce the official Weekly PMO Report. It must include:
      1. Executive Roll-up of all active project metrics
      2. Key Milestones Accomplished & Critical Bottlenecks
      3. Global Resource and Capacity Recommendations
      Format in gorgeous, boardroom-ready Markdown.
    `;

    const aiClient = this.getClient();
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return {
      weeklyReport: response.text,
    };
  }
}
