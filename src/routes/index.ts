import { Router } from "express";
import authRoutes from "./auth.routes";
import projectsRoutes from "./projects.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/auth", authRoutes);
router.use("/projects", projectsRoutes);

export default router;
