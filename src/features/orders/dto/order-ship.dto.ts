// 발송 등록
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ShippingCarriers } from '../../../shared/constants/shippingCarriers';

export class OrderShipDto {
  @IsNotEmpty() // (필수)
  @IsString()
  @IsIn(Object.values(ShippingCarriers)) // 허용값만
  carrier!: string;

  @IsNotEmpty() // (필수)
  @IsString()
  trackingNo!: string;
}
