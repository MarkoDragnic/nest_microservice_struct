import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics.module';

/**
 * Starts a lightweight HTTP server solely for Prometheus /metrics scraping.
 * Used by TCP-only microservices that don't have their own HTTP listener.
 */
export async function startMetricsServer(port: number | string): Promise<void> {
  @Module({ imports: [MetricsModule] })
  class MetricsAppModule {}

  const metricsApp = await NestFactory.create(MetricsAppModule, { logger: false });
  await metricsApp.listen(port);
}
