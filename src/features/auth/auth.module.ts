import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { OptionalJwtAccessGuard } from "./guards/optional-jwt-access.guard";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt-access" }),JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy,OptionalJwtAccessGuard],
})
export class AuthModule {}