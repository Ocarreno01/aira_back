import "dotenv/config";
import { prisma } from "../../src/lib/prisma";

async function main() {
  // -----------------------------
  // 1) ROLES
  // -----------------------------
  // Ajusta los campos si tu modelo Role tiene otros nombres
  await prisma.role.createMany({
    data: [
      {
        code: "ADMIN",
        name: "ADMIN",
        description: "Administrador del sistema",
      },
      {
        code: "VENDEDOR",
        name: "VENDEDOR",
        description: "Usuario con permisos de vendedor",
      },
    ],
    skipDuplicates: true,
  });

  const [adminRole, sellerRole] = await Promise.all([
    prisma.role.findUnique({ where: { code: "ADMIN" } }),
    prisma.role.findUnique({ where: { code: "VENDEDOR" } }),
  ]);

  // -----------------------------
  // 2) TIPOS DE DOCUMENTO (CO)
  // -----------------------------
  await prisma.documentType.createMany({
    data: [
      {
        code: "CC",
        name: "Cédula de ciudadanía",
        description: "Personas naturales",
      },
      {
        code: "CE",
        name: "Cédula de extranjería",
        description: "Extranjeros residentes",
      },
      {
        code: "TI",
        name: "Tarjeta de identidad",
        description: "Menores de edad",
      },
      {
        code: "PAS",
        name: "Pasaporte",
        description: "Documento internacional",
      },
      {
        code: "NIT",
        name: "NIT",
        description: "Identificación tributaria (empresas y algunos naturales)",
      },
      {
        code: "RC",
        name: "Registro civil",
        description: "Identificación para menores",
      },
    ],
    skipDuplicates: true,
  });

  // -----------------------------
  // 3) ESTADOS DEL PROYECTO (TABLA)
  //    En negociación => generaBitacora = true
  // -----------------------------
  await prisma.projectStatus.createMany({
    data: [
      {
        name: "Oportunidad de venta",
        description: "Prospecto inicial del proyecto",
        generaBitacora: false,
      },
      {
        name: "Cotización enviada",
        description: "Se envió propuesta/cotización al cliente",
        generaBitacora: false,
      },
      {
        name: "En negociación",
        description: "Negociación activa (requiere bitácora)",
        generaBitacora: true,
      },
      {
        name: "Vendido",
        description: "Proyecto vendido",
        generaBitacora: false,
      },
      {
        name: "Facturado",
        description: "Proyecto facturado",
        generaBitacora: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed completado ");
}

main()
  .catch(async (e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
