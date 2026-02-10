import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api", routes);

// Health check directo (por si quieres probar sin rutas)
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Manejo de errores al final
app.use(errorMiddleware);
