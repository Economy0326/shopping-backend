import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { parsePageSize } from "../../shared/pagination";
import { AdminUpsertProductDto } from "./dto/admin-product.dto";
import { ERR } from "../../shared/errors";
import { HttpException } from "@nestjs/common";

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/products")
export class AdminProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: any) {
    const { page, size, skip, take } = parsePageSize(query, 20, 100);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({}),
      this.prisma.product.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          categorySlug: true,
          name: true,
          price: true,
          isActive: true,
          createdAt: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      }),
    ]);

    const data = rows.map((p) => ({
      ...p,
      thumbnailUrl: p.images?.[0]?.url ?? null,
    }));

    return { data, meta: { page, size, total } };
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        options: { orderBy: { id: "asc" } },
        variants: { orderBy: { id: "asc" } },
      },
    });
    return product ?? null;
  }

  @Post()
  @HttpCode(200)
  async create(@Body() dto: AdminUpsertProductDto) {
    return this.upsertInternal(null, dto);
  }

  @Put(":id")
  @HttpCode(200)
  async update(@Param("id") id: string, @Body() dto: AdminUpsertProductDto) {
    return this.upsertInternal(Number(id), dto);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    // hard delete는 운영에서 위험. 일단 isActive=false로 soft delete 권장.
    await this.prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });
    return true;
  }

  private async upsertInternal(productId: number | null, dto: AdminUpsertProductDto) {
    // look 상품이면 옵션/variant 없어도 OK
    const isLook = dto.categorySlug === "look";

    return this.prisma.$transaction(async (tx) => {
      const baseData: any = {
        categorySlug: dto.categorySlug,
        name: dto.name,
        price: isLook ? 0 : (dto.price ?? 0),
        description: dto.description ?? null,

        sizeGuideText: dto.sizeGuideText ?? null,
        productInfoText: dto.productInfoText ?? null,
        sizeGuideMdUrl: dto.sizeGuideMdUrl ?? null,
        productInfoMdUrl: dto.productInfoMdUrl ?? null,
        lookMdUrl: dto.lookMdUrl ?? null,

        isActive: dto.isActive ?? true,
      };

      let product: { id: number };

      if (productId == null) {
        product = await tx.product.create({ data: baseData, select: { id: true } });
      } else {
        product = await tx.product.update({ where: { id: productId }, data: baseData, select: { id: true } });
      }

      // images replace (있으면 전체 교체)
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        if (dto.images.length) {
          await tx.productImage.createMany({
            data: dto.images.map((im) => ({
              productId: product.id,
              url: im.url,
              sortOrder: im.sortOrder ?? 0,
            })),
          });
        }
      }

      // options replace
      if (dto.options) {
        // 옵션/variant 편집은 "함께 전송" 전제
        await tx.productVariant.deleteMany({ where: { productId: product.id } });
        await tx.productOption.deleteMany({ where: { productId: product.id } });

        const createdOptions: { id: number; groupKey: string; value: string }[] = [];
        for (const opt of dto.options) {
          const row = await tx.productOption.create({
            data: {
              productId: product.id,
              groupKey: opt.groupKey,
              label: opt.label ?? opt.groupKey.toUpperCase(),
              value: opt.value,
            },
            select: { id: true, groupKey: true, value: true },
          });
          createdOptions.push(row);
        }

        if (dto.variants) {
          const optIdSet = new Set(createdOptions.map((o) => o.id));

          for (const v of dto.variants) {
            if (!v.optionIds.every((x) => optIdSet.has(x))) {
              throw new HttpException({ ...ERR.INVALID_VARIANT, details: { optionIds: v.optionIds } }, 400);
            }

            const sizeOpt = v.optionIds
              .map((id) => createdOptions.find((o) => o.id === id))
              .find((o) => o?.groupKey === "size");

            const colorOpt = v.optionIds
              .map((id) => createdOptions.find((o) => o.id === id))
              .find((o) => o?.groupKey === "color");

            await tx.productVariant.create({
              data: {
                productId: product.id,
                sizeOptionId: sizeOpt?.id ?? null,
                colorOptionId: colorOpt?.id ?? null,
                stock: v.stock,
                sku: v.sku ?? null,
                priceDelta: v.priceDelta ?? 0,
              },
            });
          }
        } else if (!isLook) {
          // variants 없으면 주문 불가 상태(재고 0 기본 variant)
          await tx.productVariant.create({
            data: { productId: product.id, stock: 0, sku: `${product.id}-DEFAULT`, priceDelta: 0 },
          });
        }
      }
      return { id: product.id };
    });
  }
}