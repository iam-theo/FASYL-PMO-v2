import { Router, Request, Response } from "express";
import { handleAgentChat, getExecutiveInsights } from "./service.ts";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, projectId, googleAccessToken, history } = req.body;

    if (!message || !projectId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: message and projectId are mandatory.",
      });
    }

    const result = await handleAgentChat({
      message,
      projectId,
      googleAccessToken,
      history,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Gemini Agent API Route Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An unexpected error occurred during agent processing.",
    });
  }
});

router.post("/executive-insights", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required."
      });
    }

    const insights = await getExecutiveInsights(projectId);
    return res.json({
      success: true,
      data: insights
    });
  } catch (error: any) {
    console.error("Executive Insights Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate executive insights."
    });
  }
});

export default router;

