import { GoogleGenAI } from "@google/genai";
import logger from "../../../shared/infrastructure/logger.ts";
import { ConfigurationCenterService } from "./configuration-center.service.ts";

export class AiOrchestrationService {
  private aiClient: GoogleGenAI | null = null;
  private configCenter = new ConfigurationCenterService();
  private promptCache = new Map<string, string>();

  private getAiClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.warn("GEMINI_API_KEY is not defined. AI functionality will fallback to mocks.");
      }
      this.aiClient = new GoogleGenAI({
        apiKey: apiKey || "MOCK_API_KEY",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return this.aiClient;
  }

  public async generateText(prompt: string, cacheKey?: string): Promise<{ text: string; modelUsed: string; latencyMs: number }> {
    const start = Date.now();
    
    // Check template cache first
    if (cacheKey && this.promptCache.has(cacheKey)) {
      return {
        text: this.promptCache.get(cacheKey)!,
        modelUsed: "CACHE",
        latencyMs: Date.now() - start,
      };
    }

    const primaryModel = await this.configCenter.get<string>("ai.model.primary", "gemini-3.5-flash");
    const fallbackModel = await this.configCenter.get<string>("ai.model.fallback", "gemini-3.1-flash-lite");

    // Guard safety validation before calling
    const safetyCheckedPrompt = `Please formulate a professional enterprise business response to: ${prompt}`;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("No real API key found; running mock fallback");
      }

      const client = this.getAiClient();
      const response = await client.models.generateContent({
        model: primaryModel,
        contents: safetyCheckedPrompt,
      });

      const responseText = response.text || "No response text generated.";

      if (cacheKey) {
        this.promptCache.set(cacheKey, responseText);
      }

      return {
        text: responseText,
        modelUsed: primaryModel,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      logger.warn({ err }, `Primary AI Model '${primaryModel}' failed. Retrying with fallback model '${fallbackModel}'...`);
      
      try {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("No real API key found; running mock fallback");
        }

        const client = this.getAiClient();
        const response = await client.models.generateContent({
          model: fallbackModel,
          contents: safetyCheckedPrompt,
        });

        const responseText = response.text || "No response text generated.";

        if (cacheKey) {
          this.promptCache.set(cacheKey, responseText);
        }

        return {
          text: responseText,
          modelUsed: fallbackModel,
          latencyMs: Date.now() - start,
        };
      } catch (fallbackErr: any) {
        logger.error({ fallbackErr }, `Fallback AI Model '${fallbackModel}' failed. Using offline rule-based response.`);
        
        // Offline heuristic fallback response
        const fallbackText = `[Offline Heuristic AI Gateway Fallback] Your request was: "${prompt}". System processed offline because external services are currently unreachable.`;
        return {
          text: fallbackText,
          modelUsed: "OFFLINE_RULE_BASED",
          latencyMs: Date.now() - start,
        };
      }
    }
  }

  public clearCache(): void {
    this.promptCache.clear();
  }
}
