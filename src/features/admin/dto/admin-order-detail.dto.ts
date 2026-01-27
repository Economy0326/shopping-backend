import { BuyerDto } from "./buyer.dto";
import { OrderAmountsDto } from "../../../shared/dto/orders/order-amounts.dto";
import { OrderShippingDto } from "../../../shared/dto/orders/order-shipping.dto";
import { OrderReceiverDetailDto } from "../../../shared/dto/orders/order-receiver.dto";
import { OrderItemDto } from "../../../shared/dto/orders/order-item.dto";

export class AdminOrderDetailDto {
  id!: string;
  status!: string;
  createdAt!: string;
  expiresAt!: string | null;

  shippedAt!: string | null;
  deliveredAt!: string | null;
  canceledAt!: string | null;

  buyer!: BuyerDto;

  // 상세는 detail shape
  receiver!: OrderReceiverDetailDto;

  payment!: { method: string; depositor: string | null };

  shipping!: OrderShippingDto;
  amounts!: OrderAmountsDto;

  items!: OrderItemDto[];

  refundLogs!: Array<{ id: string; amount: number; memo: string | null; createdAt: string }>;

  return!: null | {
    id: string;
    status: string;
    reason: string | null;
    memo: string | null;
    createdAt: string;
  };
}
