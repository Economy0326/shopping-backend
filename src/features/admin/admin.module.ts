import { Module } from "@nestjs/common";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminReturnsController } from "./admin-returns.controller";
import { AdminProductsController } from "./admin-products.controller";
import { AdminUploadsController } from "./admin-uploads.controller";

@Module({
  controllers: [
    AdminOrdersController,
    AdminReturnsController,
    AdminProductsController,
    AdminUploadsController,
  ],
})
export class AdminModule {}