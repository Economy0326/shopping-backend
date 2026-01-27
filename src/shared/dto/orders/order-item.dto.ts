// 주문 상품 정보
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class OrderItemDto {
  @IsInt() id!: number;
  @IsInt() productId!: number;

  @IsOptional()
  @IsInt()
  variantId!: number | null;

  @IsString() name!: string;

  @IsInt() @Min(1) qty!: number;

  @IsInt() @Min(0) unitPrice!: number;
  @IsInt() @Min(0) lineTotal!: number;

  @IsOptional() @IsString() thumbnailUrl!: string | null;
  @IsOptional() @IsString() optionSummary!: string | null;
}