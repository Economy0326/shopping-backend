import { Controller, Get, Param } from "@nestjs/common";
import { SystemService } from "./system.service";

@Controller("system")
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get("policies/:key")
  async policy(@Param("key") key: string) {
    return this.system.policy(key);
  }
}