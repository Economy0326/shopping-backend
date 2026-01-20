import { Body, Controller, Get, HttpCode, Param, Put, UseGuards } from "@nestjs/common";
import { SystemService } from "./system.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { AdminGuard } from "../../shared/guards/admin.guard";
import { UpdatePolicyDto } from "./dto/update-policy.dto";

@Controller("system")
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get("policies/:key")
  async policy(@Param("key") key: string) {
    return this.system.policy(key);
  }

  // ✅ 명세: PUT /system/policies/faq (admin)
  @UseGuards(JwtAccessGuard, AdminGuard)
  @Put("policies/faq")
  @HttpCode(200)
  async updateFaq(@Body() dto: UpdatePolicyDto) {
    return this.system.updatePolicy("faq", dto.value);
  }
}
