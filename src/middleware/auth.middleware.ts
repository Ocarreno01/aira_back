import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Falta JWT_SECRET en el .env");
  }
  return secret;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "Falta header Authorization" });
  }

  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ message: "Authorization debe ser: Bearer <token>" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    // En login guardamos sub = user.id
    const userId = String(decoded.sub ?? "");
    if (!userId) {
      return res.status(401).json({ message: "Token inválido (sin sub)" });
    }

    req.user = {
      id: userId,
      email: typeof decoded.email === "string" ? decoded.email : undefined,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}
