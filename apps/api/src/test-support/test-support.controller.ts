import { BadRequestException, Body, Controller, Inject, Post, Res } from "@nestjs/common";
import type { Response } from "express";

import { AuthService } from "../auth/auth.service";
import { MemoryStoreService, type TestSessionPreset } from "../store/memory-store.service";

@Controller("test")
export class TestSupportController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(MemoryStoreService) private readonly store: MemoryStoreService
  ) {}

  @Post("reset")
  reset() {
    this.store.reset();
    return { ok: true };
  }

  @Post("session")
  createSession(
    @Body() body: { preset?: TestSessionPreset },
    @Res({ passthrough: true }) response: Response
  ) {
    const preset = body.preset ?? "fresh-user";
    if (!["concierge", "guide", "fresh-user"].includes(preset)) {
      throw new BadRequestException("不支持的测试账号");
    }
    const user = this.store.ensureTestPresetUser(preset as TestSessionPreset);
    const session = this.authService.createSessionForUser(user.id);
    this.authService.writeSessionCookie(response, session.id);
    return {
      ok: true,
      preset,
      ...this.authService.getMe(user.id)
    };
  }
}
