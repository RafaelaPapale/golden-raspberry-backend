import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import {
  DocumentBuilder,
  SwaggerModule,
  SwaggerCustomOptions,
} from '@nestjs/swagger';
import 'reflect-metadata';
import * as express from 'express';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const server = app.getHttpAdapter().getInstance() as express.Application;
  server.set('query parser', 'extended');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,

      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const env = process.env.ENVIRONMENT || 'development';

      if (!origin) {
        return callback(null, true);
      }

      if (env === 'local' || env === 'development') {
        return callback(null, true);
      }

      if (origin.endsWith('.golden-raspberry.com.br')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },

    methods: '*',
  });

  const config = new DocumentBuilder()
    .setTitle('Golden Raspberry API')
    .setDescription('Documentação dos endpoints de Golden Raspberry API')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o token JWT obtido no endpoint de login',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const myCustom: SwaggerCustomOptions = {
    swaggerOptions: {
      docExpansion: 'none',
    },
  };

  SwaggerModule.setup('api-docs', app, document, myCustom);
  console.log('📚 Swagger disponível em: http://localhost:3000/api-docs');

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
