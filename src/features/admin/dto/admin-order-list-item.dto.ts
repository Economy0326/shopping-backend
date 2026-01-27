import { BuyerDto } from "./buyer.dto";
import { OrderAmountsDto } from "../../../shared/dto/orders/order-amounts.dto";
import { OrderShippingDto } from "../../../shared/dto/orders/order-shipping.dto";
import { OrderReceiverListDto } from "../../../shared/dto/orders/order-receiver.dto";

export class AdminOrderListItemDto {
  id!: string;
  status!: string;
  createdAt!: string;
  expiresAt!: string | null;

  buyer!: BuyerDto;

  // 목록도 receiver로 고정(단, list shape)
  receiver!: OrderReceiverListDto;

  payment!: { method: string; depositor: string | null };

  // 응답 shipping은 OrderShippingDto
  shipping!: OrderShippingDto;

  amounts!: OrderAmountsDto;
}
