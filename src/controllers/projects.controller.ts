import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEstimatedValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value.toString();
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) {
      return null;
    }

    const numeric = Number(normalized);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return normalized;
    }
  }

  return null;
}

export async function getProjects(_req: Request, res: Response) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        businessType: {
          select: {
            id: true,
            name: true,
          },
        },
        status: {
          select: {
            id: true,
            name: true,
            generaBitacora: true,
          },
        },
      },
    });

    return res.json(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        project: project.name,
        clientId: project.clientId,
        clientName: project.client.name,
        sellerId: project.sellerId,
        sellerName: project.seller.name,
        sellerEmail: project.seller.email,
        businessTypeId: project.businessTypeId,
        typeId: project.businessTypeId,
        businessTypeName: project.businessType.name,
        typeName: project.businessType.name,
        estimatedValue: project.estimatedValue.toString(),
        statusId: project.statusId,
        statusName: project.status.name,
        generaBitacora: project.status.generaBitacora,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    );
  } catch (error) {
    console.error("Error en getProjects:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function createProject(req: AuthRequest, res: Response) {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const name = toNonEmptyString(body.name ?? body.project ?? body.projectName);
    const clientId = toNonEmptyString(body.clientId);
    const sellerId = toNonEmptyString(body.sellerId) ?? req.user?.id ?? null;
    const businessTypeId = toNonEmptyString(
      body.businessTypeId ?? body.typeId ?? body.projectTypeId,
    );
    const estimatedValue = normalizeEstimatedValue(
      body.estimatedValue ?? body.value,
    );

    let statusId = toNonEmptyString(body.statusId);
    if (!statusId) {
      const defaultStatus = await prisma.projectStatus.findFirst({
        where: { name: { equals: "Oportunidad de venta", mode: "insensitive" } },
        select: { id: true },
      });
      statusId = defaultStatus?.id ?? null;
    }

    if (
      !name ||
      !clientId ||
      !sellerId ||
      !businessTypeId ||
      !statusId ||
      !estimatedValue
    ) {
      return res.status(400).json({
        message:
          "Campos requeridos: name/project, clientId, sellerId, businessTypeId/typeId, statusId (o estado por defecto), estimatedValue",
      });
    }

    const [client, seller, businessType, status] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: sellerId }, select: { id: true } }),
      prisma.businessType.findUnique({
        where: { id: businessTypeId },
        select: { id: true },
      }),
      prisma.projectStatus.findUnique({
        where: { id: statusId },
        select: { id: true },
      }),
    ]);

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    if (!seller) {
      return res.status(404).json({ message: "Vendedor no encontrado" });
    }
    if (!businessType) {
      return res.status(404).json({ message: "Tipo de proyecto no encontrado" });
    }
    if (!status) {
      return res.status(404).json({ message: "Estado no encontrado" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientId: client.id,
        sellerId: seller.id,
        businessTypeId: businessType.id,
        statusId: status.id,
        estimatedValue,
      },
      select: { id: true },
    });

    return res.status(201).json({ id: project.id });
  } catch (error) {
    console.error("Error en createProject:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function getClients(_req: Request, res: Response) {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        documentTypeId: true,
        documentNumber: true,
        documentType: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.json(
      clients.map((client) => ({
        id: client.id,
        name: client.name,
        label: client.name,
        value: client.id,
        documentTypeId: client.documentTypeId,
        documentTypeName: client.documentType.name,
        documentNumber: client.documentNumber,
      })),
    );
  } catch (error) {
    console.error("Error en getClients:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function getSellers(_req: Request, res: Response) {
  try {
    let sellers = await prisma.user.findMany({
      where: { role: { code: "VENDEDOR" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (sellers.length === 0) {
      sellers = await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    return res.json(
      sellers.map((seller) => ({
        id: seller.id,
        name: seller.name,
        label: seller.name,
        value: seller.id,
        email: seller.email,
      })),
    );
  } catch (error) {
    console.error("Error en getSellers:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function getStatuses(_req: Request, res: Response) {
  try {
    const statuses = await prisma.projectStatus.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        generaBitacora: true,
      },
    });

    return res.json(
      statuses.map((status) => ({
        id: status.id,
        name: status.name,
        label: status.name,
        value: status.id,
        generaBitacora: status.generaBitacora,
      })),
    );
  } catch (error) {
    console.error("Error en getStatuses:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function getTypes(_req: Request, res: Response) {
  try {
    const types = await prisma.businessType.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return res.json(
      types.map((type) => ({
        id: type.id,
        name: type.name,
        label: type.name,
        value: type.id,
      })),
    );
  } catch (error) {
    console.error("Error en getTypes:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
