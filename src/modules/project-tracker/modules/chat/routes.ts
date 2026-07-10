import { Router } from "express";
import { ChatService } from "./service.ts";

const router = Router();
const chatService = new ChatService();

router.get("/:projectId", async (req, res) => {
  try {
    const messages = await chatService.getMessages(req.params.projectId);
    res.json({ success: true, data: messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const message = await chatService.sendMessage(req.body);
    res.json({ success: true, data: message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
