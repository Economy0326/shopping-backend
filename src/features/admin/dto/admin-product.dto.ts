import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

class ImageDto {
  @IsString() url!: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

class OptionDto {
  @IsString() groupKey!: string; // size|color
  @IsOptional() @IsString() label?: string; // SIZE|COLOR
  @IsString() value!: string; // M/L/black...
}

class VariantDto {
  // optionIds 조합을 받는 게 프론트/명세와 가장 잘 맞음
  @IsArray() @IsInt({ each: true }) optionIds!: number[];
  @IsInt() @Min(0) stock!: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsInt() priceDelta?: number;
}

export class AdminUpsertProductDto {
  @IsString() categorySlug!: string;
  @IsString() name!: string;

  @IsOptional() @IsInt() price?: number;
  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() sizeGuideText?: string;
  @IsOptional() @IsString() productInfoText?: string;
  @IsOptional() @IsString() sizeGuideMdUrl?: string;
  @IsOptional() @IsString() productInfoMdUrl?: string;
  @IsOptional() @IsString() lookMdUrl?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}