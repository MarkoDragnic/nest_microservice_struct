import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import Joi from 'joi';
import path from 'path';
import { AuthHttpController } from './auth.http.controller';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthTcpController } from './auth.tcp.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { GlobalRpcExceptionFilter, HealthModule, LoggerModule, MetricsModule, RedisClientModule, REDIS_CLIENT, internalRpcSchema, redisSchema } from '@app/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { GatewayOnlyGuard } from './guards/gateway-only.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [
    HealthModule.register({ http: true, tcp: true }),
    MetricsModule,
    RedisClientModule.register(),
    ThrottlerModule.forRootAsync({
      imports: [RedisClientModule.register()],
      inject: [REDIS_CLIENT],
      useFactory: (redisClient: Redis | undefined) => ({
        throttlers: [{ ttl: 60000, limit: 20 }],
        ...(redisClient ? { storage: new ThrottlerStorageRedisService(redisClient) } : {}),
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), 'apps/auth/.env')],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRATION: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRATION: Joi.number().positive().default(604800),
        AUTH_TCP_HOST: Joi.string().required(),
        AUTH_TCP_PORT: Joi.number().required(),
        AUTH_HTTP_PORT: Joi.number().required(),
        CORS_ORIGINS: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().invalid('*').required(),
          otherwise: Joi.string().default('http://localhost:3000'),
        }),
        ...internalRpcSchema,
        ...redisSchema,
        ALLOWED_GATEWAY_IPS: Joi.string().allow('').optional().default(''),
        PG_WRITE_TCP_HOST: Joi.string().required(),
        PG_WRITE_TCP_PORT: Joi.number().required(),
        PG_READ_TCP_HOST: Joi.string().required(),
        PG_READ_TCP_PORT: Joi.number().required(),
      }),
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(configService.getOrThrow<string>('JWT_EXPIRATION')),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    LoggerModule.forRoot(),
  ],
  controllers: [AuthHttpController, AuthTcpController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    RefreshStrategy,
    RefreshTokenRepository,
    GlobalRpcExceptionFilter,
    GatewayOnlyGuard,
    RefreshAuthGuard,
  ],
})
export class AuthModule {}

