import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersMaintenance implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // 1분마다 돌림(개발/소규모)
    setInterval(() => {
      void this.tick().catch(() => undefined);
    }, 60_000);
  }

  private async tick() {
    await this.cancelExpiredAwaitingDeposit();
    await this.autoDeliverShipped();
  }

  private async cancelExpiredAwaitingDeposit() {
    const now = new Date();
    const targets = await this.prisma.order.findMany({
      where: { status: OrderStatus.AWAITING_DEPOSIT, expiresAt: { lt: now } },
      include: { items: true },
      take: 50,
    });

    for (const o of targets) {
      await this.prisma.$transaction(async (tx) => {
        const canceled = await tx.order.updateMany({
          where: { id: o.id, status: OrderStatus.AWAITING_DEPOSIT },
          data: { status: OrderStatus.CANCELED, canceledAt: new Date() },
        });
        if (canceled.count !== 1) return;

        // 상태 전이를 선점한 작업만 재고를 복구한다.
        for (const it of o.items) {
          if (it.variantId) {
            await tx.productVariant.update({
              where: { id: it.variantId },
              data: { stock: { increment: it.qty } },
            });
          }
        }
      });
    }
  }

  private async autoDeliverShipped() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    await this.prisma.order.updateMany({
      where: {
        status: OrderStatus.SHIPPED,
        shippedAt: { lt: sevenDaysAgo },
      },
      data: { status: OrderStatus.DELIVERED, deliveredAt: now },
    });
  }
}
