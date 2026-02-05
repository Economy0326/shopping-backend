import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { OrderAmountsDto } from "../../../shared/dto/orders/order-amounts.dto";

class OrderPreviewDto {
  @IsOptional() @IsString()
  name!: string | null;

  @IsOptional() @IsString()
  thumbnailUrl!: string | null;
}

export class UserOrderListItemDto {
  @IsString()
  id!: string;

  @IsString()
  status!: string;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  expiresAt!: string;

  @ValidateNested()
  @Type(() => OrderAmountsDto)
  amounts!: OrderAmountsDto;

  @ValidateNested()
  @Type(() => OrderPreviewDto)
  preview!: OrderPreviewDto;
}
