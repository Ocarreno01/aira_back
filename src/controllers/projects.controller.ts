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

function hasOwnKey(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function getFirstPresentValue(
  body: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (hasOwnKey(body, key)) {
      return body[key];
    }
  }
  return undefined;
}

export async function getProjects(_req: Request, res: Response) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        negotiation: {
          select: {
            id: true,
          },
        },
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
        negotiationId: project.negotiation?.id ?? null,
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
    const name = toNonEmptyString(
      body.name ?? body.project ?? body.projectName,
    );
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
        where: {
          name: { equals: "Oportunidad de venta", mode: "insensitive" },
        },
        select: { id: true },
      });
      statusId = defaultStatus?.id ?? null;
    }

    const missingFields: string[] = [];

    if (!name) missingFields.push("name/project");
    if (!clientId) missingFields.push("clientId");
    if (!sellerId) missingFields.push("sellerId");
    if (!businessTypeId) missingFields.push("businessTypeId/typeId");
    if (!statusId) missingFields.push("statusId");
    if (!estimatedValue) missingFields.push("estimatedValue");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Campos requeridos faltantes: ${missingFields.join(", ")}`,
      });
    }

    const [client, seller, businessType, status] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId! },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: sellerId! },
        select: { id: true },
      }),
      prisma.businessType.findUnique({
        where: { id: businessTypeId! },
        select: { id: true },
      }),
      prisma.projectStatus.findUnique({
        where: { id: statusId! },
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
      return res
        .status(404)
        .json({ message: "Tipo de proyecto no encontrado" });
    }
    if (!status) {
      return res.status(404).json({ message: "Estado no encontrado" });
    }

    const project = await prisma.project.create({
      data: {
        name: name!,
        clientId: client.id,
        sellerId: seller.id,
        businessTypeId: businessType.id,
        statusId: status.id,
        estimatedValue: estimatedValue!,
      },
      select: { id: true },
    });

    return res.status(201).json({ id: project.id });
  } catch (error) {
    console.error("Error en createProject:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function updateProject(req: AuthRequest, res: Response) {
  try {
    const projectId = toNonEmptyString(req.params.id);
    if (!projectId) {
      return res.status(400).json({ message: "id de proyecto inválido" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updateData: {
      name?: string;
      clientId?: string;
      sellerId?: string;
      businessTypeId?: string;
      statusId?: string;
      estimatedValue?: string;
    } = {};

    const nameRaw = getFirstPresentValue(body, [
      "name",
      "project",
      "projectName",
    ]);
    if (nameRaw !== undefined) {
      const name = toNonEmptyString(nameRaw);
      if (!name) {
        return res.status(400).json({ message: "name/project inválido" });
      }
      updateData.name = name;
    }

    if (hasOwnKey(body, "clientId")) {
      const clientId = toNonEmptyString(body.clientId);
      if (!clientId) {
        return res.status(400).json({ message: "clientId inválido" });
      }
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      });
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      updateData.clientId = client.id;
    }

    const sellerRaw = getFirstPresentValue(body, ["sellerId"]);
    if (sellerRaw !== undefined) {
      const sellerId = toNonEmptyString(sellerRaw) ?? req.user?.id ?? null;
      if (!sellerId) {
        return res.status(400).json({ message: "sellerId inválido" });
      }
      const seller = await prisma.user.findUnique({
        where: { id: sellerId },
        select: { id: true },
      });
      if (!seller) {
        return res.status(404).json({ message: "Vendedor no encontrado" });
      }
      updateData.sellerId = seller.id;
    }

    const businessTypeRaw = getFirstPresentValue(body, [
      "businessTypeId",
      "typeId",
      "projectTypeId",
    ]);
    if (businessTypeRaw !== undefined) {
      const businessTypeId = toNonEmptyString(businessTypeRaw);
      if (!businessTypeId) {
        return res
          .status(400)
          .json({ message: "businessTypeId/typeId inválido" });
      }
      const businessType = await prisma.businessType.findUnique({
        where: { id: businessTypeId },
        select: { id: true },
      });
      if (!businessType) {
        return res
          .status(404)
          .json({ message: "Tipo de proyecto no encontrado" });
      }
      updateData.businessTypeId = businessType.id;
    }

    const statusRaw = getFirstPresentValue(body, [
      "statusId",
      "projectStatusId",
    ]);
    if (statusRaw !== undefined) {
      const statusId = toNonEmptyString(statusRaw);
      if (!statusId) {
        return res
          .status(400)
          .json({ message: "statusId/projectStatusId inválido" });
      }
      const status = await prisma.projectStatus.findUnique({
        where: { id: statusId },
        select: { id: true },
      });
      if (!status) {
        return res.status(404).json({ message: "Estado no encontrado" });
      }
      updateData.statusId = status.id;
    }

    const estimatedValueRaw = getFirstPresentValue(body, [
      "estimatedValue",
      "value",
    ]);
    if (estimatedValueRaw !== undefined) {
      const estimatedValue = normalizeEstimatedValue(estimatedValueRaw);
      if (!estimatedValue) {
        return res.status(400).json({ message: "estimatedValue inválido" });
      }
      updateData.estimatedValue = estimatedValue;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message:
          "No se enviaron campos para actualizar. Campos válidos: name/project, clientId, sellerId, businessTypeId/typeId/projectTypeId, statusId/projectStatusId, estimatedValue/value",
      });
    }
    console.log("updateData", updateData);
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      select: { id: true },
    });

    return res.status(200).json({ id: updatedProject.id });
  } catch (error) {
    console.error("Error en updateProject:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    const projectId = toNonEmptyString(req.params.id);
    if (!projectId) {
      return res.status(400).json({ message: "id de proyecto inválido" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        negotiation: {
          select: { id: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }

    if (project.negotiation) {
      return res.status(409).json({
        message:
          "No se puede eliminar el proyecto porque tiene una negociación asociada",
      });
    }

    await prisma.project.delete({ where: { id: projectId } });
    return res.status(204).send();
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2003") {
      return res.status(409).json({
        message:
          "No se puede eliminar el proyecto porque tiene registros relacionados",
      });
    }

    console.error("Error en deleteProject:", error);
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

export async function getNegotiationStatus(_req: Request, res: Response) {
  try {
    const status = await prisma.projectStatus.findFirst({
      where: { generaBitacora: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        generaBitacora: true,
        createdAt: true,
      },
    });

    if (!status) {
      return res.status(404).json({
        message:
          "No existe un estado de proyecto configurado para negociación (generaBitacora=true)",
      });
    }

    return res.json({
      id: status.id,
      name: status.name,
      label: status.name,
      value: status.id,
      description: status.description,
      generaBitacora: status.generaBitacora,
      createdAt: status.createdAt,
    });
  } catch (error) {
    console.error("Error en getNegotiationStatus:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
