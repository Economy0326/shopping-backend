import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class AddressDto {
  @IsOptional() @IsString() zip?: string;
  @IsOptional() @IsString() address1?: string;
  @IsOptional() @IsString() address2?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;    
  @IsOptional() @IsString() displayName?: string; 
  @IsOptional() @IsString() phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
