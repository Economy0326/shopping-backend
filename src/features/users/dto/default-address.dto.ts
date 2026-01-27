import { IsOptional, IsString } from "class-validator";

export class DefaultAddressDto {
  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  address2?: string;
}
