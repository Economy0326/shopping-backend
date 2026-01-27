import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

// 주소(address) shape
export class OrderReceiverAddressDto {
  @IsString()
  zip!: string;

  @IsString()
  address1!: string;

  @IsString()
  address2!: string;
}

// 목록(list) shape
export class OrderReceiverListDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email!: string | null;
}

// 상세(detail) shape
export class OrderReceiverDetailDto extends OrderReceiverListDto {
  @ValidateNested()
  @Type(() => OrderReceiverAddressDto)
  address!: OrderReceiverAddressDto;

  @IsOptional()
  @IsString()
  memo!: string | null;
}