import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

/**
 * - 주문 items는 optionValues 기반만 허용
 * - variantId / optionIds는 프론트/유저 영역에서 아예 사용하지 않음
 */
class OptionValuesDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

class OrderItemDto {
  @IsInt()
  productId!: number;

  @IsInt()
  @Min(1)
  qty!: number;

  @ValidateNested()
  @Type(() => OptionValuesDto)
  optionValues!: OptionValuesDto;
}

class AddressDto {
  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  zipcode?: string;

  @IsString()
  address1!: string;

  @IsString()
  address2!: string;
}

class ReceiverDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsOptional()
  @IsString()
  memo?: string;
}

class PaymentDto {
  // ✅ Prisma enum 그대로 받기
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  depositor?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => ReceiverDto)
  receiver!: ReceiverDto;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment!: PaymentDto;
}
