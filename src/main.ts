import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Merchant API')
    .setDescription('API documentation for Merchant service')
    .setVersion('1.0')
    .addBearerAuth() // Add JWT Auth header support
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  
  // Enable CORS
  app.enableCors({
    origin: true, // Allow all origins, you can specify specific origins here
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
