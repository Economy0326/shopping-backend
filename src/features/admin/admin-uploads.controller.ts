import {
  Controller, Post, UseGuards, HttpCode,
  UploadedFile, UseInterceptors,
} from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@UseGuards(JwtAccessGuard, AdminGuard)
@Controller("admin/uploads")
export class AdminUploadsController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), "public", "uploads");
          ensureDir(dir);
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname || "");
          const name = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/${file.filename}` };
  }
}
