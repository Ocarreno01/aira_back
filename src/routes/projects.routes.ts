import { Router } from "express";
import {
  createProject,
  deleteProject,
  getClients,
  getNegotiationStatus,
  getProjects,
  getSellers,
  getStatuses,
  getTypes,
  updateProject,
} from "../controllers/projects.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getProjects);
router.post("/", authMiddleware, createProject);
router.put("/:id", authMiddleware, updateProject);
router.patch("/:id", authMiddleware, updateProject);
router.delete("/:id", authMiddleware, deleteProject);
router.get("/clients", authMiddleware, getClients);
router.get("/sellers", authMiddleware, getSellers);
router.get("/statuses", authMiddleware, getStatuses);
router.get("/types", authMiddleware, getTypes);
router.get("/statusWithBitacora", authMiddleware, getNegotiationStatus);

export default router;
