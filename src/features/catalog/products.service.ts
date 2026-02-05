import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { ERR } from "../../shared/errors";

/**
 * ✅ 최종 확정(유저 상품 상세 명세 1:1)
 * - images: string[] (url 배열)
 * - optionGroups: [{ key, label, options:[{ value, stock }] }]
 * - optionId/variantId/variants는 유저 응답에서 제거
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const category = String(query?.category ?? "all");
    const categoryId = query?.categoryId ? Number(query.categoryId) : null;

    const where: any = { isActive: true };

    if (categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (cat) where.categorySlug = cat.slug;
    } else if (category && category !== "all") {
      where.categorySlug = category;
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          categorySlug: true,
          name: true,
          price: true,
          description: true,
          lookMdUrl: true,
          createdAt: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      }),
    ]);

    const data = rows.map((p) => ({
      id: p.id,
      categorySlug: p.categorySlug,
      name: p.name,
      price: p.price ?? 0,
      description: p.description,
      lookMdUrl: p.lookMdUrl,
      thumbnailUrl: p.images?.[0]?.url ?? null,
      createdAt: p.createdAt,
    }));

    return { data, meta: { page, size, total } };
  }

  async detail(id: number) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        categorySlug: true,
        name: true,
        price: true,
        description: true,

        sizeGuideText: true,
        productInfoText: true,
        sizeGuideMdUrl: true,
        productInfoMdUrl: true,
        lookMdUrl: true,

        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },

        // optionGroups 구성(내부용): id는 응답에 내보내지 않음
        options: {
          orderBy: { id: "asc" },
          select: { id: true, groupKey: true, label: true, value: true },
        },

        // stock 계산(내부용): 응답에 variants는 내보내지 않음
        variants: {
          orderBy: { id: "asc" },
          select: { stock: true, sizeOptionId: true, colorOptionId: true },
        },
      },
    });

    if (!p || !p.categorySlug) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: {} } as any);
    }

    const isLook = p.categorySlug === "look";

    // ✅ images: string[]
    const images = (p.images || []).map((im) => im.url);

    // ✅ option stock 계산 정책(운영 단순/안정)
    // - 해당 옵션이 포함된 모든 variant stock 합(sum)
    const optionStockSum = new Map<number, number>();
    if (!isLook) {
      for (const v of p.variants) {
        const stock = Number(v.stock) || 0;
        if (v.sizeOptionId != null) {
          optionStockSum.set(v.sizeOptionId, (optionStockSum.get(v.sizeOptionId) ?? 0) + stock);
        }
        if (v.colorOptionId != null) {
          optionStockSum.set(v.colorOptionId, (optionStockSum.get(v.colorOptionId) ?? 0) + stock);
        }
      }
    }

    // ✅ optionGroups: value + stock만
    const groupsMap = new Map<
      string,
      { key: string; label: string; options: Array<{ value: string; stock: number }> }
    >();

    if (!isLook) {
      for (const opt of p.options) {
        const key = opt.groupKey;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            label: opt.label ?? key.toUpperCase(),
            options: [],
          });
        }
        groupsMap.get(key)!.options.push({
          value: opt.value,
          stock: optionStockSum.get(opt.id) ?? 0,
        });
      }
    }

    return {
      data: {
        id: p.id,
        categorySlug: p.categorySlug,
        name: p.name,
        price: p.price ?? 0,
        description: p.description,

        sizeGuideText: p.sizeGuideText,
        productInfoText: p.productInfoText,
        sizeGuideMdUrl: p.sizeGuideMdUrl,
        productInfoMdUrl: p.productInfoMdUrl,
        lookMdUrl: p.lookMdUrl,

        images,
        optionGroups: Array.from(groupsMap.values()),
      },
    };
  }
}
