import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./features/auth/auth.module";

// catalog
import { CategoriesModule } from "./features/catalog/categories.module";
import { ProductsModule } from "./features/catalog/products.module";

// system
import { SystemModule } from "./features/system/system.module";

// orders/returns
import { OrdersModule } from "./features/orders/orders.module";
import { ReturnsModule } from "./features/returns/returns.module";

// notices / qna
import { NoticesModule } from "./features/notices/notices.module";
import { AsksModule } from "./features/qna/asks.module";

// admin
import { AdminModule } from "./features/admin/admin.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,

    CategoriesModule,
    ProductsModule,
    SystemModule,

    OrdersModule,
    ReturnsModule,

    NoticesModule,
    AsksModule,

    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}