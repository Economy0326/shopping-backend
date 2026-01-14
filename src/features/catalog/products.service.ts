import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { ERR } from "../../shared/errors";

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

        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, sortOrder: true } },
        options: { orderBy: { id: "asc" }, select: { id: true, groupKey: true, label: true, value: true } },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            stock: true,
            sku: true,
            priceDelta: true,
            sizeOptionId: true,
            colorOptionId: true,
          },
        },
      },
    });

    if (!p || p.categorySlug == null) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: {} } as any);
    }

    // optionGroups (UI용)
    const groupsMap = new Map<string, { key: string; label: string; options: any[] }>();
    for (const opt of p.options) {
      const key = opt.groupKey;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { key, label: opt.label ?? key.toUpperCase(), options: [] });
      }
      groupsMap.get(key)!.options.push({ id: opt.id, value: opt.value });
    }

    // variants (재고/주문 기준)
    const variants = p.variants.map((v) => {
      const optionIds = [v.sizeOptionId, v.colorOptionId].filter((x) => typeof x === "number") as number[];
      return {
        id: v.id,
        optionIds,
        stock: v.stock,
        sku: v.sku,
        priceDelta: v.priceDelta ?? 0,
      };
    });

    return {
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

      images: p.images,
      optionGroups: Array.from(groupsMap.values()),
      variants,
    };
  }
}