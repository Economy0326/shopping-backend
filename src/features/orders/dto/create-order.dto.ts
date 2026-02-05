import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * ✅ 최종 확정(레거시 제거)
 * - 주문 items는 optionValues 기반만 허용
 * - variantId / optionIds는 프론트/유저 영역에서 아예 사용하지 않음
 */
class OptionValuesDto {
  // 상품에 size 옵션이 없을 수 있으니 optional (ex: color만 있는 상품)
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

  // ✅ value(string) 기반 옵션
  @ValidateNested()
  @Type(() => OptionValuesDto)
  optionValues!: OptionValuesDto;
}

class AddressDto {
  // zip / zipcode 둘 다 허용
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
  @IsString()
  @IsIn(["BANK_TRANSFER"])
  method!: string;

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
