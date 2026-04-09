import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionCookie =
      request.cookies?.[this.authService.getSessionCookieName()] ?? null;
    const auth = this.authService.resolveUserBySession(sessionCookie);
    if (!auth) {
      throw new UnauthorizedException("未登录");
    }
    request.authUserId = auth.user.user.id;
    request.sessionId = auth.sessionId;
    return true;
  }
}
