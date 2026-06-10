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
import type { CurrentUser } from '../../shared/current-user';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReturnRequestDto } from './dto/return-request.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // 회원 + 비회원 주문 생성 가능
  @UseGuards(OptionalJwtAccessGuard)
  @Post()
  @HttpCode(200)
  async create(@User() user: CurrentUser | null, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  // 회원의 내 주문 목록은 로그인 필요
  @UseGuards(JwtAccessGuard)
  @Get()
  async list(@User() user: CurrentUser, @Query() query: any) {
    return this.orders.list(user, query);
  }

  // 회원: 토큰으로 검증
  // 비회원: orderId + phone으로 검증
  @UseGuards(OptionalJwtAccessGuard)
  @Get(':id')
  async detail(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Query('phone') phone?: string,
  ) {
    return this.orders.detail(user, id, phone);
  }

  // 회원: 토큰으로 검증
  // 비회원: orderId + phone으로 검증
  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Query('phone') phone?: string,
  ) {
    return this.orders.confirmDelivered(user, id, phone);
  }

  // 회원: 토큰으로 검증
  // 비회원: orderId + phone으로 검증
  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/cancel-request')
  @HttpCode(200)
  async cancel(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Query('phone') phone?: string,
  ) {
    return this.orders.cancelRequest(user, id, phone);
  }

  // 회원: 토큰으로 검증
  // 비회원: orderId + phone으로 검증
  @UseGuards(OptionalJwtAccessGuard)
  @Post(':id/return-request')
  @HttpCode(200)
  async returnReq(
    @User() user: CurrentUser | null,
    @Param('id') id: string,
    @Body() dto: ReturnRequestDto,
    @Query('phone') phone?: string,
  ) {
    return this.orders.returnRequest(user, id, dto.reason, dto.memo, phone);
  }
}
