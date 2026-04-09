import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DidModule } from "../did/did.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [AuthModule, RealtimeModule, DidModule, NotificationsModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService]
})
export class SocialModule {}
