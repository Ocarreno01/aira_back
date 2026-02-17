import { Router } from "express";
import { getNegotiations } from "../controllers/negotiations.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getNegotiations);

export default router;
