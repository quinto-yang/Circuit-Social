import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DidModule } from "../did/did.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [AuthModule, RealtimeModule, DidModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService]
})
export class SocialModule {}
