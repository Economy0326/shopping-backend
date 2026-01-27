import { OrderStatus, ReturnStatus } from "@prisma/client";
import { emailToName } from "../../../shared/name";

type PrismaOrderListRow = {
  id: string;
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

  user: { id: string; email: string; displayName: string | null; phone: string | null };
};

type PrismaOrderDetailRow = {
  id: string;
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

  user: { id: string; email: string; displayName: string | null; phone: string | null };

  items: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    name: string;
    qty: number;
    price: number;
    thumbnailUrl: string | null;
    optionSummary: string | null;
  }>;

  return: null | {
    id: string;
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
    const buyerName = o.user.displayName ?? emailToName(o.user.email);

    return {
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,

      buyer: {
        id: o.user.id,
        email: o.user.email,
        name: buyerName, // (프론트가 buyer.name 쓰는 상태면 유지)
        phone: o.user.phone ?? null,
      },

      // receiver로 통일 (list shape)
      receiver: {
        name: o.receiverName,
        phone: o.receiverPhone,
        email: o.receiverEmail ?? null,
      },

      payment: { method: o.paymentMethod, depositor: o.depositor ?? null },

      // 응답 shipping shape
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
    };
  }

  static toAdminDetail(order: PrismaOrderDetailRow) {
    const buyerName = order.user.displayName ?? emailToName(order.user.email);
    const itemsTotal = (order.items || []).reduce((sum, it) => sum + it.price * it.qty, 0);

    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      canceledAt: order.canceledAt ? order.canceledAt.toISOString() : null,

      buyer: {
        id: order.user.id,
        email: order.user.email,
        name: buyerName,
        phone: order.user.phone ?? null,
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
