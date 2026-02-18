import { Router } from "express";
import {
  createNegotiation,
  getNegotiations,
} from "../controllers/negotiations.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getNegotiations);
router.post("/", authMiddleware, createNegotiation);

export default router;
