import { IsNotEmpty, IsString } from 'class-validator';

export class GuestOrderLookupDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;
}
