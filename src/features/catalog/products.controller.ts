import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { QueryParams } from '../../shared/current-user';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  async list(@Query() query: QueryParams) {
    return this.products.list(query);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.products.detail(Number(id));
  }
}
