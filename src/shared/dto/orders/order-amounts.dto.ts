// 주문 금액 정보
import { IsInt, Min } from "class-validator";

export class OrderAmountsDto {
  @IsInt() @Min(0) itemsTotal!: number;
  @IsInt() @Min(0) shippingFee!: number;
  @IsInt() @Min(0) discountTotal!: number;
  @IsInt() @Min(0) grandTotal!: number;
}
