import { ForbiddenException, HttpException, Injectable, NotFoundException } from "@nestjs/common";
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

    // ✅ 기본: soft delete 제외
    const where: any = { deletedAt: null };

    // 권한: user는 본인만, admin은 전체
    if (user.role !== "admin") where.userId = user.sub;

    // ✅ status filter (waiting|answered)
    const status = (query?.status ?? "").toString().trim();
    if (status === "waiting" || status === "answered") {
      where.status = status;
    }

    // ✅ q search (title/body)
    const q = (query?.q ?? "").toString().trim();
    if (q.length) {
      where.OR = [{ title: { contains: q } }, { body: { contains: q } }];
      // postgres 대소문자 무시가 필요하면:
      // where.OR = [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }];
    }

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
          userId: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    const data = rows.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      createdAt: a.createdAt,
      authorId: a.userId, // ✅ 프론트가 필요하면 바로 사용 가능
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
        deletedAt: true,
        user: { select: { email: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          select: { id: true, body: true, isAdmin: true, createdAt: true },
        },
      },
    });

    if (!row || row.deletedAt) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id } } as any);

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
      authorId: row.userId,
      authorName: emailToName(row.user.email),
      replies: row.replies,
    };
  }

  async create(user: CurrentUser, dto: { title: string; body: string }) {
    // ✅ 계정당 최대 3개 (soft delete 제외)
    const cnt = await this.prisma.ask.count({
      where: { userId: user.sub, deletedAt: null },
    });

    if (cnt >= 3) {
      throw new HttpException({ ...ERR.ASK_LIMIT_EXCEEDED, details: { limit: 3 } }, 409);
    }

    const id = makeId("q");
    const created = await this.prisma.ask.create({
      data: {
        id,
        userId: user.sub,
        title: dto.title,
        body: dto.body,
        status: "waiting",
        deletedAt: null,
      },
      select: { id: true },
    });

    return created;
  }

  async reply(admin: CurrentUser, askId: string, body: string) {
    // (컨트롤러에서 AdminGuard로 막지만, 방어적으로 유지)
    if (admin.role !== "admin") {
      throw new ForbiddenException({ ...ERR.ADMIN_ONLY, details: {} } as any);
    }

    const ask = await this.prisma.ask.findUnique({
      where: { id: askId },
      select: { id: true, deletedAt: true },
    });
    if (!ask || ask.deletedAt) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id: askId } } as any);

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

  async remove(user: CurrentUser, id: string) {
    const ask = await this.prisma.ask.findUnique({
      where: { id },
      select: { id: true, userId: true, deletedAt: true },
    });

    if (!ask || ask.deletedAt) throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id } } as any);

    if (user.role !== "admin" && ask.userId !== user.sub) {
      throw new ForbiddenException({ ...ERR.FORBIDDEN, details: {} } as any);
    }

    await this.prisma.ask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return true;
  }
}
