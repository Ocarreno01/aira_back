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
      password: hashed,
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return res.status(201).json({ user });
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
