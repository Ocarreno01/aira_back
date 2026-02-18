import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getNegotiations(_req: Request, res: Response) {
  try {
    const negotiations = await prisma.negotiation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            statusId: true,
            status: {
              select: {
                name: true,
                generaBitacora: true,
              },
            },
          },
        },
        client: {
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
        },
        logs: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            date: true,
            description: true,
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.json(
      negotiations.map((negotiation) => ({
        id: negotiation.id,
        negotiationId: negotiation.id,
        createdAt: negotiation.createdAt,
        projectId: negotiation.projectId,
        projectName: negotiation.project.name,
        statusId: negotiation.project.statusId,
        statusName: negotiation.project.status.name,
        generaBitacora: negotiation.project.status.generaBitacora,
        clientId: negotiation.clientId,
        clientName: negotiation.client.name,
        documentTypeId: negotiation.client.documentTypeId,
        documentTypeName: negotiation.client.documentType.name,
        documentNumber: negotiation.client.documentNumber,
        logsCount: negotiation.logs.length,
        logs: negotiation.logs.map((log) => ({
          id: log.id,
          date: log.date,
          description: log.description,
          sellerId: log.seller.id,
          sellerName: log.seller.name,
          sellerEmail: log.seller.email,
        })),
      })),
    );
  } catch (error) {
    console.error("Error en getNegotiations:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function createNegotiation(req: Request, res: Response) {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const projectId = toNonEmptyString(body.projectId);
    const clientId = toNonEmptyString(body.clientId);
    const sellerId = toNonEmptyString(body.sellerId);
    const description = toNonEmptyString(body.description);

    const missingFields: string[] = [];
    if (!projectId) missingFields.push("projectId");
    if (!clientId) missingFields.push("clientId");
    if (!sellerId) missingFields.push("sellerId");
    if (!description) missingFields.push("description");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Campos requeridos faltantes: ${missingFields.join(", ")}`,
      });
    }

    const [project, client, seller] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId! },
        select: { id: true, name: true, clientId: true, statusId: true },
      }),
      prisma.client.findUnique({
        where: { id: clientId! },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: sellerId! },
        select: { id: true },
      }),
    ]);

    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    if (!seller) {
      return res.status(404).json({ message: "Vendedor no encontrado" });
    }

    if (project.clientId !== client.id) {
      return res.status(400).json({
        message: "El cliente enviado no corresponde al proyecto",
      });
    }

    const existingNegotiation = await prisma.negotiation.findUnique({
      where: { projectId: project.id },
      select: { id: true },
    });

    if (existingNegotiation) {
      return res.status(409).json({
        message: "Este proyecto ya tiene una negociación creada",
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const negotiation = await tx.negotiation.create({
        data: {
          projectId: project.id,
          clientId: client.id,
        },
        select: {
          id: true,
          projectId: true,
          clientId: true,
          createdAt: true,
        },
      });

      const firstLog = await tx.negotiationLog.create({
        data: {
          negotiationId: negotiation.id,
          sellerId: seller.id,
          description: description!,
        },
        select: {
          id: true,
          negotiationId: true,
          date: true,
          description: true,
          sellerId: true,
        },
      });

      return { negotiation, firstLog };
    });

    return res.status(201).json({
      id: created.negotiation.id,
      negotiationId: created.negotiation.id,
      projectId: created.negotiation.projectId,
      clientId: created.negotiation.clientId,
      createdAt: created.negotiation.createdAt,
      title: `Negociacion para el proyecto ${project.name}`,
      firstLog: created.firstLog,
    });
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return res.status(409).json({
        message: "Este proyecto ya tiene una negociación creada",
      });
    }

    console.error("Error en createNegotiation:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
