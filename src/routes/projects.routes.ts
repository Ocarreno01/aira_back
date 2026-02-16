import { Router } from "express";
import {
  createProject,
  getClients,
  getProjects,
  getSellers,
  getStatuses,
  getTypes,
} from "../controllers/projects.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getProjects);
router.post("/", authMiddleware, createProject);
router.get("/clients", authMiddleware, getClients);
router.get("/sellers", authMiddleware, getSellers);
router.get("/statuses", authMiddleware, getStatuses);
router.get("/types", authMiddleware, getTypes);

export default router;
