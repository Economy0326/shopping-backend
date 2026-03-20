import { Injectable, NotFoundException } from "@nestjs/common";
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

    // faq가 없는 경우 404가 아니라 빈 정책으로 반환
    if (!row) {
      return {
        key,
        value: "",
        updatedAt: null,
      };
    }

    return {
      key: row.key,
      value: row.value,
      updatedAt: row.updatedAt,
    };
  }

  async updatePolicy(key: string, value: string) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: { key } } as any);
    }

    const row = await this.prisma.systemPolicy.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return {
      key: row.key,
      value: row.value,
      updatedAt: row.updatedAt,
    };
  }
}