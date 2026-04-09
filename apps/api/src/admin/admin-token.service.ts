import { Injectable } from "@nestjs/common";

const DEFAULT_ADMIN_TOKEN = "123";

@Injectable()
export class AdminTokenService {
  private token: string;
  private usingDefaultToken: boolean;

  constructor() {
    const fromEnv = process.env.ADMIN_TOKEN?.trim();
    if (fromEnv) {
      this.token = fromEnv;
      this.usingDefaultToken = false;
      return;
    }
    this.token = DEFAULT_ADMIN_TOKEN;
    this.usingDefaultToken = true;
  }

  verify(token: string | undefined): boolean {
    if (!token) return false;
    return token.trim() === this.token;
  }

  rotate(nextToken: string) {
    this.token = nextToken.trim();
    this.usingDefaultToken = false;
  }

  isUsingDefaultToken() {
    return this.usingDefaultToken;
  }
}
