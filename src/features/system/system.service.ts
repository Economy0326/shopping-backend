import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ERR } from "../../shared/errors";

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async policy(key: string) {
    const row = await this.prisma.systemPolicy.findUnique({ where: { key } });
    if (!row) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { key } } as any);
    return { key: row.key, value: row.value, updatedAt: row.updatedAt };
  }
}