import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { OptionalJwtAccessGuard } from '../auth/guards/optional-jwt-access.guard';
import { User } from '../../shared/decorators/user.decorator';
import type { CurrentUser, QueryParams } from '../../shared/current-user';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReturnRequestDto } from './dto/return-request.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @UseGuards(OptionalJwtAccessGuard)
  @Post()
  @HttpCode(200)
  async create(@User() user: CurrentUser | null, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Post('guest/lookup')
  @HttpCode(200)
  async guestLookup(
    @Body('orderId') orderId: string,
    @Body('phone') phone: string,
  ) {
    return this.orders.detail(null, orderId, phone);
  }

  @UseGuards(JwtAccessGuard)
  @Get()
  async list(@User() user: CurrentUser, @Query() query: QueryParams) {
    return this.orders.list(user, query);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Get(':id')
  async detail(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Query('phone') phone?: string,
  ) {
    return this.orders.detail(user, id, phone);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Query('phone') queryPhone?: string,
    @Body('phone') bodyPhone?: string,
  ) {
    return this.orders.confirmDelivered(user, id, queryPhone ?? bodyPhone);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/cancel-request')
  @HttpCode(200)
  async cancel(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Query('phone') queryPhone?: string,
    @Body('phone') bodyPhone?: string,
  ) {
    return this.orders.cancelRequest(user, id, queryPhone ?? bodyPhone);
  }

  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/return-request')
  @HttpCode(200)
  async returnReq(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Body() dto: ReturnRequestDto,
    @Query('phone') queryPhone?: string,
    @Body('phone') bodyPhone?: string,
  ) {
    return this.orders.returnRequest(
      user,
      id,
      dto.reason,
      dto.memo,
      queryPhone ?? bodyPhone,
    );
  }
}
