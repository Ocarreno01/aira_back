import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
