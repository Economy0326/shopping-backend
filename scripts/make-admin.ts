import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    throw new Error(
      "사용할 이메일을 인자로 넣어주세요. 예: npm run make:admin -- admin@example.com"
    );
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
    select: { id: true, email: true, role: true },
  });

  console.log("admin 승격 완료:", user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });