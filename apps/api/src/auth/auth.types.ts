import type { Request } from "express";

export type AuthenticatedRequest = Request & {
  authUserId: number;
  sessionId: string;
};
