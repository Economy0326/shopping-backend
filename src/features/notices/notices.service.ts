import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { makeId } from "../../shared/ids";
import { ERR } from "../../shared/errors";
import { NoticeDto } from "./dto/notice.dto";

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const { page, size, skip, take } = parsePageSize(query, 10, 100);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notice.count({}),
      this.prisma.notice.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: { id: true, title: true, body: true, createdAt: true },
      }),
    ]);

    return { data: rows, meta: { page, size, total } };
  }

  async detail(id: string) {
    const row = await this.prisma.notice.findUnique({
      where: { id },
      select: { id: true, title: true, body: true, createdAt: true },
    });
    if (!row) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id } } as any);
    return row;
  }

  async create(dto: NoticeDto) {
    const id = makeId("n");
    return this.prisma.notice.create({
      data: { id, title: dto.title, body: dto.body },
      select: { id: true },
    });
  }

  async update(id: string, dto: NoticeDto) {
    await this.detail(id);
    await this.prisma.notice.update({ where: { id }, data: { title: dto.title, body: dto.body } });
    return true;
  }

  async remove(id: string) {
    await this.detail(id);
    await this.prisma.notice.delete({ where: { id } });
    return true;
  }
}