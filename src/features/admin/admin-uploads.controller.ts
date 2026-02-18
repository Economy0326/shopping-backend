import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/uploads")
export class AdminUploadsController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("file", {
      // diskStorage 제거 → memoryStorage(기본) 사용
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("파일이 필요합니다.");
    }
    if (!file.buffer) {
      // 혹시 설정이 꼬여 disk로 들어오면 안전하게 막기
      throw new BadRequestException("파일 버퍼가 없습니다. (memoryStorage 설정을 확인하세요)");
    }

    const safeOriginalName = (file.originalname || "file").replace(/[^\w.\-() ]+/g, "_");
    const key = `uploads/${Date.now()}-${randomUUID()}-${safeOriginalName}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`;

    return { url: publicUrl, key };
  }
}
