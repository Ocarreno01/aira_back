import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Falta JWT_SECRET en el .env");
  }
  return secret;
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email y password son requeridos" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        roleId: "7d6850ba-ddb8-45bf-a58b-a6bea14cf7ee",
        password: hashed,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    console.log("user", user);
    return res.status(201).json({ user });
  } catch (error) {
    console.error("Error en register:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function login(
  req: Request,
  res: Response,
): Promise<Response<{ status: boolean; token?: string; message?: string }>> {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res
      .status(200)
      .json({ status: false, message: "email y password son requeridos" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res
      .status(200)
      .json({ status: false, message: "Credenciales inválidas" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res
      .status(200)
      .json({ status: false, message: "Credenciales inválidas" });
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, getJwtSecret());

  return res.json({
    status: true,
    token,
  });
}

export async function getMe(
  req: Request,
  res: Response,
): Promise<Response<{ status: boolean; token?: string; message?: string }>> {
  return res.json({ ok: true, user: (req as any).user });
}
