import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AskStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePageSize } from '../../shared/pagination';
import { makeId } from '../../shared/ids';
import { emailToName } from '../../shared/name';
import type { CurrentUser, QueryParams } from '../../shared/current-user';
import { ERR } from '../../shared/errors';

@Injectable()
export class AsksService {
  constructor(private readonly prisma: PrismaService) {}

  private userId(user: CurrentUser): number | null {
    const n = Number(user.sub);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private isAdmin(user: CurrentUser): boolean {
    return user.role === 'admin';
  }

  private toClientStatus(status: AskStatus | null | undefined) {
    return String(status ?? '').toLowerCase();
  }

  async list(user: CurrentUser, query: QueryParams) {
    const { page, size, skip, take } = parsePageSize(query, 10, 100);

    const where: Prisma.AskWhereInput = { deletedAt: null };

    if (!this.isAdmin(user)) {
      const uid = this.userId(user);

      if (uid === null) {
        throw new ForbiddenException({
          ...ERR.FORBIDDEN,
          details: { reason: 'Invalid_token_sub' },
        });
      }

      where.userId = uid;
    }

    const raw = String(query.status ?? '').trim();
    const status = raw.toUpperCase();

    if (
      status === AskStatus.WAITING ||
      status === AskStatus.ANSWERED ||
      status === AskStatus.CLOSED
    ) {
      where.status = status;
    }

    const q = String(query.q ?? '').trim();

    if (q.length > 0) {
      where.OR = [{ title: { contains: q } }, { body: { contains: q } }];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.ask.count({ where }),
      this.prisma.ask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
      status: this.toClientStatus(a.status),
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
          orderBy: { createdAt: 'asc' },
          select: { id: true, body: true, isAdmin: true, createdAt: true },
        },
      },
    });

    if (!row || row.deletedAt) {
      throw new NotFoundException({
        ...ERR.NOT_FOUND,
        details: { id },
      });
    }

    const isAdmin = this.isAdmin(user);
    const uid = this.userId(user);

    if (uid === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: 'Invalid_token_sub' },
      });
    }

    if (!isAdmin && row.userId !== uid) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: {},
      });
    }

    return {
      id: row.id,
      title: row.title,
      body: row.body,
      status: this.toClientStatus(row.status),
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
        details: { reason: 'Invalid_token_sub' },
      });
    }

    const cnt = await this.prisma.ask.count({
      where: { userId: uid, deletedAt: null },
    });

    if (cnt >= 3) {
      throw new HttpException(
        { ...ERR.ASK_LIMIT_EXCEEDED, details: { limit: 3 } },
        409,
      );
    }

    const id = makeId('q');

    const created = await this.prisma.ask.create({
      data: {
        id,
        userId: uid,
        title: dto.title,
        body: dto.body,
        status: AskStatus.WAITING,
        deletedAt: null,
      },
      select: { id: true },
    });

    return { id: created.id };
  }

  async reply(admin: CurrentUser, askId: string, body: string) {
    if (!this.isAdmin(admin)) {
      throw new ForbiddenException({
        ...ERR.ADMIN_ONLY,
        details: {},
      });
    }

    const ask = await this.prisma.ask.findUnique({
      where: { id: askId },
      select: { id: true, deletedAt: true },
    });

    if (!ask || ask.deletedAt) {
      throw new NotFoundException({
        ...ERR.NOT_FOUND,
        details: { id: askId },
      });
    }

    const id = makeId('r');
    const adminId = this.userId(admin);

    if (adminId === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: 'Invalid_token_sub' },
      });
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
        data: { status: AskStatus.ANSWERED },
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
      throw new NotFoundException({
        ...ERR.NOT_FOUND,
        details: { id },
      });
    }

    const isAdmin = this.isAdmin(user);
    const uid = this.userId(user);

    if (uid === null) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: { reason: 'Invalid_token_sub' },
      });
    }

    if (!isAdmin && ask.userId !== uid) {
      throw new ForbiddenException({
        ...ERR.FORBIDDEN,
        details: {},
      });
    }

    await this.prisma.ask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return true;
  }
}
