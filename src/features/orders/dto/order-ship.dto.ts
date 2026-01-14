import { IsOptional, IsString } from "class-validator";

export class OrderShipDto {
  @IsOptional() @IsString() carrier?: string;
  @IsOptional() @IsString() trackingNo?: string;
}