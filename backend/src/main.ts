import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  console.log('🔧 Starting TakeTenDash backend...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

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