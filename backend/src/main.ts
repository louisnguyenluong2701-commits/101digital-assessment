import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // CORS for the React frontend.
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({ origin: corsOrigin.split(','), credentials: true });

  // Global validation using class-validator + class-transformer.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Consistent error responses everywhere.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger / OpenAPI documentation at /api/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SimpleInvoice API')
    .setDescription('REST API for the SimpleInvoice application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(config.get<string>('PORT', '3000'), 10);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SimpleInvoice API running on http://localhost:${port} (docs: /api/docs)`);
}

bootstrap();
