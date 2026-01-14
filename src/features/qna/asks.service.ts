import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { makeId } from "../../shared/ids";
import { emailToName } from "../../shared/name";
import type { CurrentUser } from "../../shared/current-user";
import { ERR } from "../../shared/errors";

@Injectable()
export class AsksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser, query: any) {
    const { page, size, skip, take } = parsePageSize(query, 10, 100);

    const where: any = user.role === "admin" ? {} : { userId: user.sub };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.ask.count({ where }),
      this.prisma.ask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    const data = rows.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      createdAt: a.createdAt,
      authorName: emailToName(a.user.email),
    }));

    return { data, meta: { page, size, total } };
  }

  async detail(user: CurrentUser, id: string) {
    const row = await this.prisma.ask.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          select: { id: true, body: true, isAdmin: true, createdAt: true },
        },
      },
    });

    if (!row) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id } } as any);

    // 일반 유저는 본인 글만 접근
    if (user.role !== "admin" && row.userId !== user.sub) {
      throw new ForbiddenException({ ...ERR.FORBIDDEN, details: {} } as any);
    }

    return {
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      createdAt: row.createdAt,
      authorId: String(row.userId),
      authorName: emailToName(row.user.email),
      replies: row.replies,
    };
  }

  async create(user: CurrentUser, dto: { title: string; body: string }) {
    const id = makeId("q");
    const created = await this.prisma.ask.create({
      data: {
        id,
        userId: user.sub,
        title: dto.title,
        body: dto.body,
        status: "waiting",
      },
      select: { id: true },
    });
    return created;
  }

  async reply(admin: CurrentUser, askId: string, body: string) {
    if (admin.role !== "admin") {
      throw new ForbiddenException({ ...ERR.ADMIN_ONLY, details: {} } as any);
    }

    const ask = await this.prisma.ask.findUnique({ where: { id: askId }, select: { id: true } });
    if (!ask) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id: askId } } as any);

    const id = makeId("r");

    await this.prisma.$transaction(async (tx) => {
      await tx.askReply.create({
        data: {
          id,
          askId,
          userId: admin.sub,
          body,
          isAdmin: true,
        },
      });

      await tx.ask.update({
        where: { id: askId },
        data: { status: "answered" },
      });
    });

    return { id };
  }
}