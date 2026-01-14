import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class OrderItemDto {
  @IsInt() productId!: number;
  @IsInt() variantId!: number;
  @IsInt() @Min(1) qty!: number;
}

class ReceiverDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsString() address1!: string;
  @IsString() address2!: string;
  @IsString() zip!: string;
  @IsOptional() @IsString() email?: string;
}

class PaymentDto {
  @IsString() method!: string; // BANK_TRANSFER
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => ReceiverDto)
  receiver!: ReceiverDto;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;

  @IsOptional() @IsString() memo?: string;
}