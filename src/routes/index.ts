import { Router } from "express";
import authRoutes from "./auth.routes";
import negotiationsRoutes from "./negotiations.routes";
import projectsRoutes from "./projects.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/projects", projectsRoutes);
router.use("/negotiations", negotiationsRoutes);

export default router;
