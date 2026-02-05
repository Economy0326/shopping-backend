import { Type } from "class-transformer";
import { IsInt, Min, IsArray, IsDateString, IsOptional, IsString, ValidateNested } from "class-validator";
import { OrderAmountsDto } from "../../../shared/dto/orders/order-amounts.dto";
import { OrderItemDto } from "../../../shared/dto/orders/order-item.dto";
import { OrderReceiverDetailDto } from "../../../shared/dto/orders/order-receiver.dto";
import { OrderShippingDto } from "../../../shared/dto/orders/order-shipping.dto";

class OrderPaymentDto {
  @IsString()
  method!: string;

  @IsOptional()
  @IsString()
  depositor!: string | null;
}

class RefundLogDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  memo!: string | null;

  @IsDateString()
  createdAt!: string;
}

class ReturnDto {
  @IsString()
  id!: string;

  @IsString()
  status!: string;
}

export class UserOrderDetailDto {
  @IsString()
  id!: string;

  @IsString()
  status!: string;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  expiresAt!: string;

  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment!: OrderPaymentDto;

  @ValidateNested()
  @Type(() => OrderReceiverDetailDto)
  receiver!: OrderReceiverDetailDto;

  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping!: OrderShippingDto;

  @ValidateNested()
  @Type(() => OrderAmountsDto)
  amounts!: OrderAmountsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsArray()
  refundLogs!: RefundLogDto[];

  @IsOptional()
  return!: ReturnDto | null;
}
