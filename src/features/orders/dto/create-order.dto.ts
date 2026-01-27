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

class OrderItemDto {
  @IsInt()
  productId!: number;

  @IsInt()
  @Min(1)
  qty!: number;

  // variantId 우선 (있으면 그대로 사용)
  @IsOptional()
  @IsInt()
  variantId?: number;

  // variantId 없으면 optionIds 조합으로 매칭
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  optionIds?: number[];
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
