import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const data = await this.prisma.category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, slug: true, name: true },
    });
    return data;
  }
}