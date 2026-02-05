import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminUpsertProductDto } from "./dto/admin-product.dto";
import { parsePageSize } from "../../shared/pagination";

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** ✅ 관리자 상품 목록 */
  async list(query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);

    const where: any = {};
    const categorySlug = (query?.categorySlug ?? query?.category ?? "")
      .toString()
      .trim();
    if (categorySlug) where.categorySlug = categorySlug;

    const q = (query?.q ?? "").toString().trim();
    if (q.length) where.name = { contains: q, mode: "insensitive" };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          categorySlug: true,
          name: true,
          price: true,
          isActive: true,
          createdAt: true,
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            select: { url: true },
          },
        },
      }),
    ]);

    return {
      data: rows.map((p) => ({
        ...p,
        thumbnailUrl: p.images?.[0]?.url ?? null,
      })),
      meta: { page, size, total },
    };
  }

  /**
   * ✅ 관리자 상품 상세(편집용)
   * - 프론트 기준: optionId/variantId 노출 ❌
   * - optionGroups는 value 기반으로만 내려줌
   * - stock은 variants에서 “해당 option이 포함된 variant들의 stock 중 max”로 추정
   */
  async detail(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        options: { orderBy: { id: "asc" } },
        variants: { orderBy: { id: "asc" } },
      },
    });

    if (!product) return { data: null };

    // 옵션별 stock 추정(운영 편의)
    // - sizeOptionId / colorOptionId가 일치하는 variant들의 stock 중 최대값
    const stockByOptionId = new Map<number, number>();
    for (const v of product.variants) {
      if (v.sizeOptionId != null) {
        stockByOptionId.set(
          v.sizeOptionId,
          Math.max(stockByOptionId.get(v.sizeOptionId) ?? 0, v.stock)
        );
      }
      if (v.colorOptionId != null) {
        stockByOptionId.set(
          v.colorOptionId,
          Math.max(stockByOptionId.get(v.colorOptionId) ?? 0, v.stock)
        );
      }
    }

    // options -> optionGroups (value 기반 + stock 포함)
    const optionGroups = ["size", "color"].flatMap((key) => {
      const opts = product.options.filter((o) => o.groupKey === key);
      if (!opts.length) return [];
      return [
        {
          key,
          label: opts[0]?.label ?? key.toUpperCase(),
          options: opts.map((o) => ({
            value: o.value,
            stock: stockByOptionId.get(o.id) ?? 0,
          })),
        },
      ];
    });

    return {
      data: {
        id: product.id,
        categorySlug: product.categorySlug,
        name: product.name,
        price: product.price,
        description: product.description,
        sizeGuideText: product.sizeGuideText,
        productInfoText: product.productInfoText,
        sizeGuideMdUrl: product.sizeGuideMdUrl,
        productInfoMdUrl: product.productInfoMdUrl,
        lookMdUrl: product.lookMdUrl,
        isActive: product.isActive,
        // ✅ 프론트는 url string[]로 받는다고 했으니 유지
        images: product.images.map((i) => i.url),
        optionGroups, // ✅ value(string) 기준
      },
    };
  }

  /**
   * ✅ 상품 생성/수정 통합(upsert)
   * - images: url string[] (sortOrder는 배열 인덱스)
   * - optionGroups: value 기반으로 options/variants "전량 재생성"
   * - optionId/variantId는 백엔드 내부 책임(프론트 노출 ❌)
   */
  async upsert(productId: number | null, dto: AdminUpsertProductDto) {
    const isLook = dto.categorySlug === "look"; // look 상품이면 옵션/variant 없어도 OK

    return this.prisma.$transaction(async (tx) => {
      // ✅ 기본 필드 저장
      const baseData: any = {
        categorySlug: dto.categorySlug,
        name: dto.name,
        price: isLook ? 0 : dto.price ?? 0,
        description: dto.description ?? null,

        sizeGuideText: dto.sizeGuideText ?? null,
        productInfoText: dto.productInfoText ?? null,
        sizeGuideMdUrl: dto.sizeGuideMdUrl ?? null,
        productInfoMdUrl: dto.productInfoMdUrl ?? null,
        lookMdUrl: dto.lookMdUrl ?? null,

        isActive: dto.isActive ?? true,
      };

      const product =
        productId == null
          ? await tx.product.create({ data: baseData, select: { id: true } })
          : await tx.product.update({
              where: { id: productId },
              data: baseData,
              select: { id: true },
            });

      // ✅ images replace (url[] 기반)
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        if (dto.images.length) {
          await tx.productImage.createMany({
            data: dto.images.map((url, idx) => ({
              productId: product.id,
              url,
              sortOrder: idx,
            })),
          });
        }
      }

      // ✅ 옵션/바리언트 전량 재생성 (value 기준)
      if (dto.optionGroups) {
        await tx.productVariant.deleteMany({ where: { productId: product.id } });
        await tx.productOption.deleteMany({ where: { productId: product.id } });

        // optionGroups 정규화(size/color만)
        const groups = dto.optionGroups
          .filter((g) => g && (g.key === "size" || g.key === "color"))
          .map((g) => ({
            key: g.key,
            label: g.label ?? g.key.toUpperCase(),
            options: (g.options || [])
              .map((o) => ({
                value: String(o.value ?? "").trim(),
                stock: Number.isFinite(Number(o.stock))
                  ? Math.max(0, Number(o.stock))
                  : 0,
              }))
              .filter((o) => o.value.length > 0),
          }))
          .filter((g) => g.options.length > 0);

        // ✅ 옵션이 아예 없으면: (look이 아니면) 기본 variant 1개 생성(재고 0)
        if (!groups.length) {
          if (!isLook) {
            await tx.productVariant.create({
              data: {
                productId: product.id,
                stock: 0,
                sku: `${product.id}-DEFAULT`,
                priceDelta: 0,
              },
            });
          }
          return { data: { id: product.id } };
        }

        // ✅ ProductOption 생성 (value 저장)
        const createdOptions: Array<{
          id: number;
          groupKey: "size" | "color";
          value: string;
          stock: number;
        }> = [];

        for (const g of groups) {
          for (const o of g.options) {
            const row = await tx.productOption.create({
              data: {
                productId: product.id,
                groupKey: g.key,
                label: g.label,
                value: o.value,
              },
              select: { id: true, groupKey: true, value: true },
            });

            createdOptions.push({
              id: row.id,
              groupKey: row.groupKey as "size" | "color",
              value: row.value,
              stock: o.stock,
            });
          }
        }

        const sizes = createdOptions.filter((o) => o.groupKey === "size");
        const colors = createdOptions.filter((o) => o.groupKey === "color");

        // ✅ variant 생성 규칙(2그룹 기준)
        // - size+color 둘 다 있으면: 조합 생성, stock=min(sizeStock,colorStock)
        // - 하나만 있으면: 그 옵션만 가진 variant 생성(stock=optionStock)
        if (sizes.length && colors.length) {
          for (const s of sizes) {
            for (const c of colors) {
              await tx.productVariant.create({
                data: {
                  productId: product.id,
                  sizeOptionId: s.id,
                  colorOptionId: c.id,
                  stock: Math.min(s.stock, c.stock),
                  sku: `${product.id}-${s.value}-${c.value}`,
                  priceDelta: 0,
                },
              });
            }
          }
        } else if (sizes.length) {
          for (const s of sizes) {
            await tx.productVariant.create({
              data: {
                productId: product.id,
                sizeOptionId: s.id,
                colorOptionId: null,
                stock: s.stock,
                sku: `${product.id}-${s.value}`,
                priceDelta: 0,
              },
            });
          }
        } else if (colors.length) {
          for (const c of colors) {
            await tx.productVariant.create({
              data: {
                productId: product.id,
                sizeOptionId: null,
                colorOptionId: c.id,
                stock: c.stock,
                sku: `${product.id}-${c.value}`,
                priceDelta: 0,
              },
            });
          }
        }
      }

      return { data: { id: product.id } };
    });
  }

  /** ✅ soft delete */
  async remove(id: number) {
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { data: true };
  }
}
