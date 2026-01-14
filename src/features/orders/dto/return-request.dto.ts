import { IsOptional, IsString } from "class-validator";
export class ReturnRequestDto {
  @IsOptional() @IsString() reason?: string;
}