import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersMaintenance } from "./orders.maintenance";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersMaintenance],
  exports: [OrdersService],
})
export class OrdersModule {}