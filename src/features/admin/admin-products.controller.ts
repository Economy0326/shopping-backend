import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { AdminUpsertProductDto } from "./dto/admin-product.dto";
import { AdminProductsService } from "./admin-products.service";

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/products")
export class AdminProductsController {
  constructor(private readonly service: AdminProductsService) {}

  /** 관리자 상품 목록 */
  @Get()
  list(@Query() query: any) {
    return this.service.list(query);
  }

  /** ✅ 관리자 상품 상세(편집용) - optionGroups를 value 기반으로 내려줌 */
  @Get(":id")
  detail(@Param("id") id: string) {
    return this.service.detail(Number(id));
  }

  /** ✅ 생성/수정/패치 모두 upsert로 통일 */
  @Post()
  @HttpCode(200)
  create(@Body() dto: AdminUpsertProductDto) {
    return this.service.upsert(null, dto);
  }

  @Put(":id")
  @HttpCode(200)
  update(@Param("id") id: string, @Body() dto: AdminUpsertProductDto) {
    return this.service.upsert(Number(id), dto);
  }

  @Patch(":id")
  @HttpCode(200)
  patch(@Param("id") id: string, @Body() dto: AdminUpsertProductDto) {
    return this.service.upsert(Number(id), dto);
  }

  /** ✅ 운영은 soft delete 권장(isActive=false) */
  @Delete(":id")
  @HttpCode(200)
  remove(@Param("id") id: string) {
    return this.service.remove(Number(id));
  }
}
