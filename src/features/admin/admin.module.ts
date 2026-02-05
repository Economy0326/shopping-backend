import { Module } from "@nestjs/common";

import { AdminOrdersController } from "./admin-orders.controller";
import { AdminReturnsController } from "./admin-returns.controller";
import { AdminProductsController } from "./admin-products.controller";
import { AdminUploadsController } from "./admin-uploads.controller";

import { AdminProductsService } from "./admin-products.service";
import { AdminOrdersService } from "./admin-orders.service";
import { AdminNoticesController } from "./admin-notices.controller";

@Module({
  controllers: [
    AdminOrdersController,
    AdminReturnsController,
    AdminProductsController,
    AdminUploadsController,
    AdminNoticesController,
  ],
  providers: [
    AdminProductsService,
    AdminOrdersService, 
  ],
  exports: [
    AdminProductsService,
  ],
})
export class AdminModule {}
