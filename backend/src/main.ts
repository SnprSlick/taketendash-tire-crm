import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaService } from './prisma/prisma.service';
import { json, urlencoded } from 'express';
import * as dns from 'dns';

async function bootstrap() {
  // Force IPv4 DNS resolution to avoid issues with Railway internal networking
  try {
    dns.setDefaultResultOrder('ipv4first');
    console.log('🔧 DNS resolution set to prefer IPv4');
  } catch (e) {
    console.warn('⚠️ Could not set DNS result order:', e.message);
  }

  console.log('🔧 Starting TakeTenDash backend...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Increase payload size limit to 2GB
  app.use(json({ limit: '2gb' }));
  app.use(urlencoded({ extended: true, limit: '2gb' }));

  console.log('✅ NestJS application created');

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Apollo-Tracing',
    ],
    credentials: true,
  });

  console.log('✅ CORS configured');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
    }),
  );

  console.log('✅ Global pipes configured');

  const server = app.getHttpAdapter().getInstance();
  const router = server._router;
  const availableRoutes: [] = router.stack
    .map((layer) => {
      if (layer.route) {
        return {
          route: {
            path: layer.route?.path,
            method: layer.route?.stack[0].method,
          },
        };
      }
    })
    .filter((item) => item !== undefined);
  console.log('Available Routes:', JSON.stringify(availableRoutes, null, 2));

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  console.log('✅ Global filters configured');

  // Set global prefix for REST API
  app.setGlobalPrefix('api/v1', { exclude: ['/graphql', '/', '/health', '/api', '/favicon.ico'] });

  console.log('✅ Global prefix configured');

  const port = process.env.PORT || 3001;
  console.log(`🔧 Starting HTTP server on port ${port}...`);

  await app.listen(port);

  console.log(`🚀 Tire CRM Backend running on port ${port}`);
  console.log(`🔗 Health Check: http://localhost:${port}/health`);
  console.log(`📖 CSV Import API: http://localhost:${port}/api/v1/csv-import`);
  console.log(`📊 API Info: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});