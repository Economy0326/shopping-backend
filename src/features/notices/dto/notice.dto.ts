import { IsString } from "class-validator";

export class NoticeDto {
  @IsString() title!: string;
  @IsString() body!: string;
}