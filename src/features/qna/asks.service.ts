import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { parsePageSize } from "../../shared/pagination";
import { makeId } from "../../shared/ids";
import { emailToName } from "../../shared/name";
import type { CurrentUser } from "../../shared/current-user";
import { ERR } from "../../shared/errors";

@Injectable()
export class AsksService {
  constructor(private readonly prisma: PrismaService) {}

  private userId(user: CurrentUser): number | null {
    const v = (user as any)?.sub;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private isAdmin(user: CurrentUser) {
    return String((user as any)?.role ?? "").toLowerCase() === "admin";
  }

  async list(user: CurrentUser, query: any) {
    const { page, size, skip, take } = parsePageSize(query, 10, 100);

    const where: any = { deletedAt: null };

    // user는 본인만, admin은 전체
    if (!this.isAdmin(user)) {
      const uid = this.userId(user);
      if (uid === null) {
        throw new ForbiddenException({
          ...ERR.FORBIDDEN,
          details: { reason: "Invalid_token_sub" },
        } as any);
      }
      where.userId = uid;
    }

    // status filter
    const status = (query?.status ?? "").toString().trim();
    if (status === "waiting" || status === "answered") where.status = status;

    // q search
    const q = (query?.q ?? "").toString().trim();
    if (q.length) where.OR = [{ title: { contains: q } }, { body: { contains: q } }];

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
      authorId: a.userId,
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

    if (!row || row.deletedAt) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id } } as any);
    }

    const isAdmin = this.isAdmin(user);
    const uid = this.userId(user);
    if (uid === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: "Invalid_token_sub" },
      } as any);
    }

    // 유저는 본인 글만
    if (!isAdmin && row.userId !== uid) {
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
    const uid = this.userId(user);
    if (uid === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: "Invalid_token_sub" },
      } as any);
    }

    const cnt = await this.prisma.ask.count({
      where: { userId: uid, deletedAt: null },
    });

    if (cnt >= 3) {
      throw new HttpException({ ...ERR.ASK_LIMIT_EXCEEDED, details: { limit: 3 } }, 409);
    }

    const id = makeId("q");
    const created = await this.prisma.ask.create({
      data: {
        id,
        userId: uid,
        title: dto.title,
        body: dto.body,
        status: "waiting",
        deletedAt: null,
      },
      select: { id: true },
    });

    return { id: created.id };
  }

  async reply(admin: CurrentUser, askId: string, body: string) {
    if (!this.isAdmin(admin)) {
      throw new ForbiddenException({ ...ERR.ADMIN_ONLY, details: {} } as any);
    }

    const ask = await this.prisma.ask.findUnique({
      where: { id: askId },
      select: { id: true, deletedAt: true },
    });
    if (!ask || ask.deletedAt) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id: askId } } as any);
    }

    const id = makeId("r");
    const adminId = this.userId(admin);
    if (adminId === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: "Invalid_token_sub" },
      } as any);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.askReply.create({
        data: {
          id,
          askId,
          userId: adminId,
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

    if (!ask || ask.deletedAt) {
      throw new NotFoundException({ ...ERR.NOT_FOUND, details: { id } } as any);
    }

    const isAdmin = this.isAdmin(user);
    const uid = this.userId(user);
    if (uid === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: "Invalid_token_sub" },
      } as any);
    }

    if (!isAdmin && ask.userId !== uid) {
      throw new ForbiddenException({ ...ERR.FORBIDDEN, details: {} } as any);
    }

    await this.prisma.ask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return true;
  }
}
