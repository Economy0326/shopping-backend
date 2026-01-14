import { IsString } from "class-validator";

export class AskDto {
  @IsString() title!: string;
  @IsString() body!: string;
}