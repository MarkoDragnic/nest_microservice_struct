import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import Joi from 'joi';
import path from 'path';
import { RobotGateModule } from './robot_gate/robot_gate.module';
import { UserGateModule } from './user_gate/user_gate.module';
import { AuthProxyMiddleware } from './middleware/auth_proxy.middleware';
import { AuthRateLimitMiddleware } from './middleware/auth-rate-limit.middleware';
import { AccountGateModule } from './account_gate/account_gate.module';
import { AuthGateController } from './auth_gate/auth_gate.controller';
import { HealthModule, LoggerModule, MetricsModule, RedisClientModule, ThrottlerRedisModule, internalRpcSchema } from '@app/common';

@Module({
  imports: [
    HealthModule.register({ http: true, tcp: false }),
    MetricsModule,
    RedisClientModule.register(),
    ThrottlerRedisModule.forRoot({ ttl: 60000, limit: 100 }),
    LoggerModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(process.cwd(), 'apps/gateway/.env')],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
        HTTP_PORT: Joi.number().required(),
        CORS_ORIGINS: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().invalid('*').required(),
          otherwise: Joi.string().default('http://localhost:3000'),
        }),
        ...internalRpcSchema,
        AUTH_HTTP_BASE_URL: Joi.string().uri().optional(),
        AUTH_HTTP_HOST: Joi.string().required(),
        AUTH_HTTP_PORT: Joi.number().optional().default(3001),
        AUTH_CLIENT_HOST: Joi.string().required(),
        AUTH_CLIENT_PORT: Joi.number().required(),
        ROBOTS_CLIENT_HOST: Joi.string().required(),
        ROBOTS_CLIENT_PORT: Joi.number().required(),
        PG_READ_CLIENT_HOST: Joi.string().required(),
        PG_READ_CLIENT_PORT: Joi.number().required(),
        ACCOUNTS_CLIENT_HOST: Joi.string().required(),
        ACCOUNTS_CLIENT_PORT: Joi.number().required(),
      }),
    }),

    RobotGateModule,
    UserGateModule,
    AccountGateModule,
  ],
  controllers: [AuthGateController],
  providers: [],
})
export class GatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthRateLimitMiddleware, AuthProxyMiddleware)
      .forRoutes({ path: 'auth', method: RequestMethod.ALL }, { path: 'auth/*path', method: RequestMethod.ALL });
  }
}
