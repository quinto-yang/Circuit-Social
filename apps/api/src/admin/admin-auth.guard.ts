import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import { AdminTokenService } from "./admin-token.service";

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(@Inject(AdminTokenService) private readonly adminToken: AdminTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers.authorization;
    const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : undefined;
    const headerToken =
      typeof request.headers["x-admin-token"] === "string"
        ? request.headers["x-admin-token"].trim()
        : undefined;
    const provided = bearer || headerToken;
    if (!this.adminToken.verify(provided)) {
      throw new UnauthorizedException({
        message: "管理密钥无效",
        code: "ADMIN_UNAUTHORIZED"
      });
    }
    return true;
  }
}
