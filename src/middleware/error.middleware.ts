import { NextFunction, Request, Response } from "express";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("Error capturado:", err);
  res.status(500).json({ message: "Error interno del servidor" });
}
