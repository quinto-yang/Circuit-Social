import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  liveness() {
    return { ok: true as const };
  }
}
