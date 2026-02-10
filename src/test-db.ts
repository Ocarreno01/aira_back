import { prisma } from "./lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("users:", users);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
