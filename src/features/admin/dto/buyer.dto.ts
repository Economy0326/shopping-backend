import { IsInt, IsOptional, IsString } from "class-validator";

export class BuyerDto {
  @IsInt() id!: number;
  @IsString() email!: string;
  @IsOptional() @IsString() displayName!: string | null;
  @IsOptional() @IsString() phone!: string | null;
}