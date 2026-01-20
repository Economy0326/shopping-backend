import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function img(seed: string, i: number) {
  // 임시 이미지(무료 placeholder). 실운영에선 S3/R2로 교체.
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}-${i}/900/900`;
}

async function main() {
  // 0) 카테고리 (slug는 프론트/명세 기준)
  const categories = [
    { slug: "outer", name: "OUTER" },
    { slug: "top", name: "TOP" },
    { slug: "bottom", name: "BOTTOM" },
    { slug: "acc", name: "ACC" },
    { slug: "for-artist", name: "FOR ARTIST" },
    { slug: "look", name: "LOOK" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
  }

  // 1) 시스템 정책 (key: returns/bankAccount/shipping)
  await prisma.systemPolicy.upsert({
    where: { key: "returns" },
    update: {},
    create: {
      key: "returns",
      value:
        "교환/반품은 수령 후 7일 이내 가능합니다.\n상품 훼손/착용 흔적이 있는 경우 반품이 제한될 수 있습니다.",
    },
  });

  await prisma.systemPolicy.upsert({
    where: { key: "bankAccount" },
    update: {},
    create: {
      key: "bankAccount",
      value:
        "은행: 국민은행\n계좌: 000000-00-000000\n예금주: 홍길동\n\n주문 후 12시간 내 미입금 시 자동 취소됩니다.",
    },
  });

  await prisma.systemPolicy.upsert({
    where: { key: "shipping" },
    update: {},
    create: {
      key: "shipping",
      value:
        "배송은 결제(입금확인) 후 1~3영업일 내 출고됩니다.\n택배사 사정에 따라 지연될 수 있습니다.",
    },
  });

  await prisma.systemPolicy.upsert({
    where: { key: "faq" },
    update: {},
    create: {
      key: "faq",
      value: "FAQ를 준비 중입니다.\n\nQ: 배송은 얼마나 걸리나요?\nA: 입금 확인 후 1~3영업일 내 출고됩니다.",
    },
  });

  // 2) 관리자 계정 생성
  const adminEmail = "admin@example.com";
  const adminPw = "admin1234"; // 개발용. 배포 전 반드시 변경.
  const adminHash = await bcrypt.hash(adminPw, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.admin },
    create: { email: adminEmail, password: adminHash, role: UserRole.admin },
  });

  // 3) 더미 상품 10개 (옵션/variant 포함 + look 몇개)
  const productsSeed = [
    { categorySlug: "outer", name: "워밍업 코트", price: 71000, hasOptions: true },
    { categorySlug: "outer", name: "바람막이 재킷", price: 59000, hasOptions: true },
    { categorySlug: "top", name: "베이직 티셔츠", price: 29000, hasOptions: true },
    { categorySlug: "top", name: "오버핏 셔츠", price: 49000, hasOptions: true },
    { categorySlug: "bottom", name: "데님 팬츠", price: 55000, hasOptions: true },
    { categorySlug: "bottom", name: "조거 팬츠", price: 42000, hasOptions: true },
    { categorySlug: "acc", name: "캡 모자", price: 19000, hasOptions: false },
    { categorySlug: "acc", name: "에코 백", price: 24000, hasOptions: false },
    { categorySlug: "look", name: "LOOKBOOK 01", price: 0, hasOptions: false },
    { categorySlug: "look", name: "LOOKBOOK 02", price: 0, hasOptions: false },
  ];

  for (const p of productsSeed) {
    // 이미 있으면 스킵(이름 + 카테고리로 간단 체크)
    const exists = await prisma.product.findFirst({
      where: { name: p.name, categorySlug: p.categorySlug },
      select: { id: true },
    });
    if (exists) continue;

    const created = await prisma.product.create({
      data: {
        categorySlug: p.categorySlug,
        name: p.name,
        price: p.categorySlug === "look" ? 0 : p.price,
        description:
          p.categorySlug === "look"
            ? "룩북 설명을 준비 중입니다."
            : "상품 설명을 준비 중입니다.",
        sizeGuideText: p.categorySlug === "look" ? null : "사이즈 안내 텍스트 (임시)",
        productInfoText: p.categorySlug === "look" ? null : "상품 정보 텍스트 (임시)",
        lookMdUrl: p.categorySlug === "look" ? null : null,
        isActive: true,
        images: {
          create: [
            { url: img(p.name, 1), sortOrder: 0 },
            { url: img(p.name, 2), sortOrder: 1 },
          ],
        },
      },
      select: { id: true, categorySlug: true },
    });

    // 옵션 없는 상품은 variant를 1개만(재고만 관리)
    if (!p.hasOptions) {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          stock: created.categorySlug === "look" ? 9999 : 20,
          sku: `${created.id}-DEFAULT`,
          priceDelta: 0,
        },
      });
      continue;
    }

    // 옵션 있는 상품: size(M/L), color(black/white) 만들어서 조합 variant 생성
    const sizeLabel = "SIZE";
    const colorLabel = "COLOR";

    const sizeValues = ["M", "L"];
    const colorValues = ["black", "white"];

    // 타입이 never로 안 깨지게 명시적으로 배열 타입을 줌
    const sizeOptions: { id: number; value: string }[] = [];
    for (const v of sizeValues) {
      const opt = await prisma.productOption.create({
        data: {
          productId: created.id,
          groupKey: "size",
          label: sizeLabel,
          value: v,
        },
        select: { id: true, value: true },
      });
      sizeOptions.push(opt);
    }

    const colorOptions: { id: number; value: string }[] = [];
    for (const v of colorValues) {
      const opt = await prisma.productOption.create({
        data: {
          productId: created.id,
          groupKey: "color",
          label: colorLabel,
          value: v,
          sku: `${created.id}-${v.toUpperCase()}`,
          priceDelta: 0,
        },
        select: { id: true, value: true },
      });
      colorOptions.push(opt);
    }

    // 조합 variant (M/L x black/white = 4개)
    for (const s of sizeOptions) {
      for (const c of colorOptions) {
        await prisma.productVariant.create({
          data: {
            productId: created.id,
            sizeOptionId: s.id,
            colorOptionId: c.id,
            stock: 5,
            sku: `${created.id}-${s.value}-${c.value}`,
            priceDelta: 0,
          },
        });
      }
    }
  }

  console.log("✅ Seed done");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
