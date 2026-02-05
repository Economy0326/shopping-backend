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

class OptionGroupOptionDto {
  @IsString() value!: string;
  @IsOptional() @IsInt() @Min(0) stock?: number; // 프론트가 stock을 함께 보냄(0 가능)
}

class OptionGroupDto {
  @IsString() key!: string; // size|color (지금은 2그룹 고정 기준)
  @IsOptional() @IsString() label?: string; // SIZE|COLOR
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionGroupOptionDto)
  options!: OptionGroupOptionDto[];
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

  // 프론트가 url string[]로 보내는 형태
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  // optionGroups 그대로
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionGroupDto)
  optionGroups?: OptionGroupDto[];
}
