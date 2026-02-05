// 배송 정보
import { IsOptional, IsString, IsDateString } from "class-validator";

export class OrderShippingDto {
  @IsOptional()
  @IsString()
  carrier!: string | null;

  @IsOptional()
  @IsString()
  trackingNo!: string | null;

  @IsOptional()
  @IsDateString()
  shippedAt!: string | null;

  @IsOptional()
  @IsDateString()
  deliveredAt!: string | null;
}
