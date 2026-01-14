import { IsString } from "class-validator";

export class OrderIdParam {
  @IsString()
  id!: string;
}