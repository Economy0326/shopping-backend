import { OrderStatus, ReturnStatus } from '@prisma/client';
import { emailToName } from '../../../shared/name';

type AdminUser = {
  id: number | string;
  email: string;
  displayName: string | null;
  phone: string | null;
} | null;

type PrismaOrderListRow = {
  id: string;
  userId?: number | null;
  status: OrderStatus;
  createdAt: Date;
  expiresAt: Date | null;
  grandTotal: number;

  paymentMethod: string;
  depositor: string | null;

  receiverName: string;
  receiverPhone: string;
  receiverEmail: string | null;

  carrier: string | null;
  trackingNo: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;

  user: AdminUser;

  items: Array<{
    name: string;
    thumbnailUrl: string | null;
    optionSummary: string | null;
  }>;

  _count: {
    items: number;
  };

  return: null | {
    id: number | string;
    status: ReturnStatus;
    reason: string | null;
    memo: string | null;
    createdAt: Date;
  };
};

type PrismaOrderDetailRow = {
  id: string;
  userId?: number | null;
  status: OrderStatus;
  createdAt: Date;
  expiresAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  canceledAt: Date | null;

  paymentMethod: string;
  depositor: string | null;

  receiverName: string;
  receiverPhone: string;
  receiverEmail: string | null;

  zip: string;
  address1: string;
  address2: string;
  memo: string | null;

  carrier: string | null;
  trackingNo: string | null;

  grandTotal: number;

  user: AdminUser;

  items: Array<{
    id: string;
    productId: number | string;
    variantId: number | string | null;
    name: string;
    qty: number;
    price: number;
    thumbnailUrl: string | null;
    optionSummary: string | null;
  }>;

  return: null | {
    id: number | string;
    status: ReturnStatus;
    reason: string | null;
    memo: string | null;
    createdAt: Date;
  };

  refundLogs: Array<{
    id: string;
    amount: number;
    memo: string | null;
    createdAt: Date;
  }>;
};

export class OrderMapper {
  static toAdminListItem(o: PrismaOrderListRow) {
    const isGuestOrder = !o.user;

    const buyerName = isGuestOrder
      ? o.receiverName
      : (o.user?.displayName ?? emailToName(o.user?.email ?? ''));

    return {
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,

      isGuestOrder,
      ordererType: isGuestOrder ? 'guest' : 'member',

      buyer: {
        id: o.user?.id ?? null,
        email: o.user?.email ?? o.receiverEmail ?? null,
        name: buyerName,
        phone: o.user?.phone ?? o.receiverPhone ?? null,
      },

      receiver: {
        name: o.receiverName,
        phone: o.receiverPhone,
        email: o.receiverEmail ?? null,
      },

      payment: {
        method: o.paymentMethod,
        depositor: o.depositor ?? null,
      },

      shipping: {
        carrier: o.carrier ?? null,
        trackingNo: o.trackingNo ?? null,
        shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
        deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
      },

      amounts: {
        itemsTotal: o.grandTotal,
        shippingFee: 0,
        discountTotal: 0,
        grandTotal: o.grandTotal,
      },

      representativeItem: {
        name: o.items?.[0]?.name ?? null,
        thumbnailUrl: o.items?.[0]?.thumbnailUrl ?? null,
        optionSummary: o.items?.[0]?.optionSummary ?? null,
      },

      itemsCount: o._count?.items ?? 0,

      return: o.return
        ? {
            id: o.return.id,
            status: o.return.status,
            reason: o.return.reason ?? null,
            memo: o.return.memo ?? null,
            createdAt: o.return.createdAt.toISOString(),
          }
        : null,
    };
  }

  static toAdminDetail(order: PrismaOrderDetailRow) {
    const isGuestOrder = !order.user;

    const buyerName = isGuestOrder
      ? order.receiverName
      : (order.user?.displayName ?? emailToName(order.user?.email ?? ''));

    const itemsTotal = (order.items || []).reduce(
      (sum, it) => sum + it.price * it.qty,
      0,
    );

    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,

      shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      canceledAt: order.canceledAt ? order.canceledAt.toISOString() : null,

      isGuestOrder,
      ordererType: isGuestOrder ? 'guest' : 'member',

      buyer: {
        id: order.user?.id ?? null,
        email: order.user?.email ?? order.receiverEmail ?? null,
        name: buyerName,
        phone: order.user?.phone ?? order.receiverPhone ?? null,
      },

      receiver: {
        name: order.receiverName,
        phone: order.receiverPhone,
        email: order.receiverEmail ?? null,
        address: {
          zip: order.zip,
          address1: order.address1,
          address2: order.address2,
        },
        memo: order.memo ?? null,
      },

      payment: {
        method: order.paymentMethod,
        depositor: order.depositor ?? null,
      },

      shipping: {
        carrier: order.carrier ?? null,
        trackingNo: order.trackingNo ?? null,
        shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
        deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      },

      amounts: {
        itemsTotal,
        shippingFee: 0,
        discountTotal: 0,
        grandTotal: order.grandTotal,
      },

      items: (order.items || []).map((it) => ({
        id: it.id,
        productId: it.productId,
        variantId: it.variantId,
        name: it.name,
        qty: it.qty,
        unitPrice: it.price,
        lineTotal: it.price * it.qty,
        thumbnailUrl: it.thumbnailUrl ?? null,
        optionSummary: it.optionSummary ?? null,
      })),

      return: order.return
        ? {
            id: order.return.id,
            status: order.return.status,
            reason: order.return.reason ?? null,
            memo: order.return.memo ?? null,
            createdAt: order.return.createdAt.toISOString(),
          }
        : null,

      refundLogs: (order.refundLogs || []).map((r) => ({
        id: r.id,
        amount: r.amount,
        memo: r.memo,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
