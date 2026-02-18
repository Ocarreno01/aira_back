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

export async function getNegotiationById(req: Request, res: Response) {
  try {
    const negotiationId = toNonEmptyString(req.params.id);
    if (!negotiationId) {
      return res.status(400).json({ message: "id de negociación inválido" });
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientId: true,
            sellerId: true,
            businessTypeId: true,
            estimatedValue: true,
            statusId: true,
            createdAt: true,
            updatedAt: true,
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

    if (!negotiation) {
      return res.status(404).json({ message: "Negociación no encontrada" });
    }

    return res.json({
      negotiation: {
        id: negotiation.id,
        projectId: negotiation.projectId,
        clientId: negotiation.clientId,
        createdAt: negotiation.createdAt,
      },
      project: {
        id: negotiation.project.id,
        name: negotiation.project.name,
        clientId: negotiation.project.clientId,
        clientName: negotiation.project.client.name,
        sellerId: negotiation.project.sellerId,
        sellerName: negotiation.project.seller.name,
        sellerEmail: negotiation.project.seller.email,
        businessTypeId: negotiation.project.businessTypeId,
        businessTypeName: negotiation.project.businessType.name,
        estimatedValue: negotiation.project.estimatedValue.toString(),
        statusId: negotiation.project.statusId,
        statusName: negotiation.project.status.name,
        generaBitacora: negotiation.project.status.generaBitacora,
        createdAt: negotiation.project.createdAt,
        updatedAt: negotiation.project.updatedAt,
      },
      logs: negotiation.logs.map((log) => ({
        id: log.id,
        date: log.date,
        description: log.description,
        sellerId: log.seller.id,
        sellerName: log.seller.name,
        sellerEmail: log.seller.email,
      })),
    });
  } catch (error) {
    console.error("Error en getNegotiationById:", error);
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

export async function createNegotiationLog(req: AuthRequest, res: Response) {
  try {
    const negotiationId = toNonEmptyString(req.params.negotiationId);
    if (!negotiationId) {
      return res.status(400).json({ message: "negotiationId inválido" });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const description = toNonEmptyString(body.description);
    const sellerId = toNonEmptyString(body.sellerId) ?? req.user?.id ?? null;

    const missingFields: string[] = [];
    if (!description) missingFields.push("description");
    if (!sellerId) missingFields.push("sellerId");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Campos requeridos faltantes: ${missingFields.join(", ")}`,
      });
    }

    const [negotiation, seller] = await Promise.all([
      prisma.negotiation.findUnique({
        where: { id: negotiationId },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: sellerId! },
        select: { id: true, name: true, email: true },
      }),
    ]);

    if (!negotiation) {
      return res.status(404).json({ message: "Negociación no encontrada" });
    }
    if (!seller) {
      return res.status(404).json({ message: "Vendedor no encontrado" });
    }

    const log = await prisma.negotiationLog.create({
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
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      id: log.id,
      negotiationId: log.negotiationId,
      date: log.date,
      description: log.description,
      sellerId: log.seller.id,
      sellerName: log.seller.name,
      sellerEmail: log.seller.email,
    });
  } catch (error) {
    console.error("Error en createNegotiationLog:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
