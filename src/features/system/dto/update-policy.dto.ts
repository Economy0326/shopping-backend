import { IsString } from "class-validator";

export class UpdatePolicyDto {
  @IsString()
  value!: string;
}