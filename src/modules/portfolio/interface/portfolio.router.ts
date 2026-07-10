import { Router } from "express";
import { PortfolioController } from "./portfolio.controller.ts";
import { PortfolioService } from "../application/portfolio.service.ts";

const router = Router();
const service = new PortfolioService();
const controller = new PortfolioController(service);

/**
 * @swagger
 * /portfolios:
 *   get:
 *     summary: Retrieve a list of portfolios
 *     tags: [Portfolios]
 *     responses:
 *       200:
 *         description: A list of portfolios
 */
router.get("/", controller.list);

/**
 * @swagger
 * /portfolios:
 *   post:
 *     summary: Create a new portfolio
 *     tags: [Portfolios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created portfolio
 */
router.post("/", controller.create);

export default router;
