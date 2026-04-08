import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { TestSupportController } from "./test-support.controller";

@Module({
  imports: [AuthModule],
  controllers: [TestSupportController]
})
export class TestSupportModule {}
