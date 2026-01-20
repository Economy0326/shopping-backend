import { Injectable, NotFoundException, HttpException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ERR } from "../../shared/errors";

const ALLOWED_KEYS = new Set(["returns", "bankAccount", "shipping", "faq"]);

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async policy(key: string) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: { key } } as any);
    }

    const row = await this.prisma.systemPolicy.findUnique({ where: { key } });
    if (!row) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { key } } as any);
    return { key: row.key, value: row.value, updatedAt: row.updatedAt };
  }

  async updatePolicy(key: string, value: string) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: { key } } as any);
    }

    // upsert로 없으면 생성까지 (운영 편의)
    await this.prisma.systemPolicy.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return true;
  }
}
