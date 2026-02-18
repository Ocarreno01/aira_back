import { Router } from "express";
import {
  createNegotiation,
  createNegotiationLog,
  getNegotiationById,
  getNegotiations,
} from "../controllers/negotiations.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getNegotiations);
router.get("/:id", authMiddleware, getNegotiationById);
router.post("/", authMiddleware, createNegotiation);
router.post("/:negotiationId/logs", authMiddleware, createNegotiationLog);

export default router;
