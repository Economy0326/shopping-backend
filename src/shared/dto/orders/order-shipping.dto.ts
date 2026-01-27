// 배송 정보
export class OrderShippingDto {
  carrier!: string | null;
  trackingNo!: string | null;
  shippedAt!: string | null;
  deliveredAt!: string | null;
}