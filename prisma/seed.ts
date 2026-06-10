import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const productImages: Record<string, string> = {
  "워밍업 코트": `${FRONTEND_ORIGIN}/images/products/warming-coat.png`,
  "바람막이 재킷": `${FRONTEND_ORIGIN}/images/products/windbreaker.png`,
  "베이직 티셔츠": `${FRONTEND_ORIGIN}/images/products/basic-tshirt.png`,
  "오버핏 셔츠": `${FRONTEND_ORIGIN}/images/products/overshirt.png`,
  "데님 팬츠": `${FRONTEND_ORIGIN}/images/products/denim-pants.png`,
  "조거 팬츠": `${FRONTEND_ORIGIN}/images/products/jogger-pants.png`,
  "캡 모자": `${FRONTEND_ORIGIN}/images/products/cap.png`,
  "에코 백": `${FRONTEND_ORIGIN}/images/products/eco-bag.png`,
  "LOOKBOOK 01": `${FRONTEND_ORIGIN}/images/products/lookbook-01.png`,
  "LOOKBOOK 02": `${FRONTEND_ORIGIN}/images/products/lookbook-02.png`,
};

function getImageOrThrow(productName: string) {
  const image = productImages[productName];

  if (!image) {
    throw new Error(`이미지 매핑이 없습니다: ${productName}`);
  }

  return image;
}

async function clearProductData() {
  console.log("🧹 기존 상품 데이터 삭제 중...");

  /**
   * 네 schema 기준 관계:
   *
   * ProductImage -> Product: onDelete Cascade
   * ProductOption -> Product: onDelete Cascade
   * ProductVariant -> Product: onDelete Cascade
   *
   * 하지만 OrderItem.productId -> Product: onDelete Restrict 라서
   * 주문 데이터가 기존 상품을 참조하고 있으면 Product 삭제가 막힐 수 있음.
   *
   * README 캡처용 개발 DB이고 기존 주문/상품 데이터 전부 지워도 된다면
   * 주문 관련 데이터까지 같이 정리하는 게 안전함.
   */

  await prisma.refundLog.deleteMany();
  await prisma.return.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  await prisma.productVariant.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();

  console.log("✅ 기존 상품/주문 데이터 삭제 완료");
}

async function seedCategories() {
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

  console.log("✅ 카테고리 upsert 완료");
}

async function seedSystemPolicies() {
  await prisma.systemPolicy.upsert({
    where: { key: "returns" },
    update: {
      value:
        "교환/반품은 수령 후 7일 이내 가능합니다.\n상품 훼손/착용 흔적이 있는 경우 반품이 제한될 수 있습니다.",
    },
    create: {
      key: "returns",
      value:
        "교환/반품은 수령 후 7일 이내 가능합니다.\n상품 훼손/착용 흔적이 있는 경우 반품이 제한될 수 있습니다.",
    },
  });

  await prisma.systemPolicy.upsert({
    where: { key: "bankAccount" },
    update: {
      value:
        "은행: 국민은행\n계좌: 000000-00-000000\n예금주: 홍길동\n\n주문 후 12시간 내 미입금 시 자동 취소됩니다.",
    },
    create: {
      key: "bankAccount",
      value:
        "은행: 국민은행\n계좌: 000000-00-000000\n예금주: 홍길동\n\n주문 후 12시간 내 미입금 시 자동 취소됩니다.",
    },
  });

  await prisma.systemPolicy.upsert({
    where: { key: "shipping" },
    update: {
      value:
        "배송은 결제(입금확인) 후 1~3영업일 내 출고됩니다.\n택배사 사정에 따라 지연될 수 있습니다.",
    },
    create: {
      key: "shipping",
      value:
        "배송은 결제(입금확인) 후 1~3영업일 내 출고됩니다.\n택배사 사정에 따라 지연될 수 있습니다.",
    },
  });

  await prisma.systemPolicy.upsert({
    where: { key: "faq" },
    update: {
      value:
        "FAQ를 준비 중입니다.\n\nQ: 배송은 얼마나 걸리나요?\nA: 입금 확인 후 1~3영업일 내 출고됩니다.",
    },
    create: {
      key: "faq",
      value:
        "FAQ를 준비 중입니다.\n\nQ: 배송은 얼마나 걸리나요?\nA: 입금 확인 후 1~3영업일 내 출고됩니다.",
    },
  });

  console.log("✅ 시스템 정책 upsert 완료");
}

async function main() {
  await clearProductData();
  await seedCategories();
  await seedSystemPolicies();

  const productsSeed = [
    {
      categorySlug: "outer",
      name: "워밍업 코트",
      price: 71000,
      hasOptions: true,
      description:
        "간절기부터 겨울까지 활용하기 좋은 워밍업 코트입니다. 데일리하게 매치하기 좋은 심플한 실루엣이 특징입니다.",
    },
    {
      categorySlug: "outer",
      name: "바람막이 재킷",
      price: 59000,
      hasOptions: true,
      description:
        "가볍고 실용적인 바람막이 재킷입니다. 캐주얼한 무드로 다양한 룩에 활용하기 좋습니다.",
    },
    {
      categorySlug: "top",
      name: "베이직 티셔츠",
      price: 29000,
      hasOptions: true,
      description:
        "군더더기 없는 디자인의 베이직 티셔츠입니다. 단독 착용은 물론 이너로도 활용도가 높습니다.",
    },
    {
      categorySlug: "top",
      name: "오버핏 셔츠",
      price: 49000,
      hasOptions: true,
      description:
        "트렌디한 실루엣의 오버핏 셔츠입니다. 편안하면서도 스타일리시한 핏을 연출할 수 있습니다.",
    },
    {
      categorySlug: "bottom",
      name: "데님 팬츠",
      price: 55000,
      hasOptions: true,
      description:
        "기본에 충실한 데님 팬츠입니다. 다양한 상의와 매치하기 쉬운 데일리 아이템입니다.",
    },
    {
      categorySlug: "bottom",
      name: "조거 팬츠",
      price: 42000,
      hasOptions: true,
      description:
        "편안한 착용감과 캐주얼한 무드의 조거 팬츠입니다. 원마일웨어로도 활용하기 좋습니다.",
    },
    {
      categorySlug: "acc",
      name: "캡 모자",
      price: 19000,
      hasOptions: false,
      description:
        "심플한 포인트 아이템으로 활용하기 좋은 캡 모자입니다.",
    },
    {
      categorySlug: "acc",
      name: "에코 백",
      price: 24000,
      hasOptions: false,
      description:
        "가볍고 실용적인 디자인의 에코 백입니다. 데일리 수납용으로 편하게 사용할 수 있습니다.",
    },
    {
      categorySlug: "look",
      name: "LOOKBOOK 01",
      price: 0,
      hasOptions: false,
      description:
        "미니멀한 캐주얼 무드의 룩북 콘텐츠입니다.",
    },
    {
      categorySlug: "look",
      name: "LOOKBOOK 02",
      price: 0,
      hasOptions: false,
      description:
        "트렌디한 스타일링을 담은 룩북 콘텐츠입니다.",
    },
  ];

  for (const p of productsSeed) {
    const imageUrl = getImageOrThrow(p.name);

    const created = await prisma.product.create({
      data: {
        categorySlug: p.categorySlug,
        name: p.name,
        price: p.categorySlug === "look" ? 0 : p.price,
        description: p.description,
        sizeGuideText:
          p.categorySlug === "look"
            ? null
            : "SIZE GUIDE\nM: 총장 68 / 어깨 50 / 가슴 56\nL: 총장 72 / 어깨 54 / 가슴 60\n※ 측정 방법에 따라 1~3cm 오차가 있을 수 있습니다.",
        productInfoText:
          p.categorySlug === "look"
            ? null
            : "상품 정보\n- 소재: 상세페이지 참고\n- 제조국: 대한민국\n- 세탁 방법: 단독 손세탁 또는 드라이클리닝 권장",
        lookMdUrl: null,
        isActive: true,
        images: {
          create: [
            {
              url: imageUrl,
              sortOrder: 0,
            },
          ],
        },
      },
      select: {
        id: true,
        categorySlug: true,
        name: true,
      },
    });

    if (!p.hasOptions) {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          stock: created.categorySlug === "look" ? 9999 : 20,
          sku: `${created.id}-DEFAULT`,
          priceDelta: 0,
        },
      });

      console.log(`✅ 생성 완료: ${created.name}`);
      continue;
    }

    const sizeValues = ["M", "L"];
    const colorValues = ["black", "white"];

    const sizeOptions: { id: number; value: string }[] = [];

    for (const v of sizeValues) {
      const opt = await prisma.productOption.create({
        data: {
          productId: created.id,
          groupKey: "size",
          label: "SIZE",
          value: v,
        },
        select: {
          id: true,
          value: true,
        },
      });

      sizeOptions.push(opt);
    }

    const colorOptions: { id: number; value: string }[] = [];

    for (const v of colorValues) {
      const opt = await prisma.productOption.create({
        data: {
          productId: created.id,
          groupKey: "color",
          label: "COLOR",
          value: v,
          sku: `${created.id}-${v.toUpperCase()}`,
          priceDelta: 0,
        },
        select: {
          id: true,
          value: true,
        },
      });

      colorOptions.push(opt);
    }

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

    console.log(`✅ 생성 완료: ${created.name}`);
  }

  console.log("🎉 Seed done");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });