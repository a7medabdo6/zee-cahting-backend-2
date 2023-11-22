import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ServiceAccount } from 'firebase-admin';
import * as serviceAccountFile from 'serviceAccountKey.json';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { SocketIOAdapter } from './chat/common/socket-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // remove any properties that don't have a matching DTO
    forbidNonWhitelisted: true, // throw an error if a property that doesn't have a matching DTO
    transform: true, // transform the incoming data to the DTO type
    stopAtFirstError: true,
  }));

  const adminConfig: ServiceAccount = {
    projectId: serviceAccountFile.project_id,
    privateKey: serviceAccountFile.private_key,
    clientEmail: serviceAccountFile.client_email,
  };
  admin.initializeApp({
    credential: admin.credential.cert(adminConfig),
  });

  const configService = app.get(ConfigService);

  const clientPort = parseInt(configService.get('PORT'));

  app.enableCors({
    origin: [
      `http://localhost:${clientPort}`,
      new RegExp(`/^http:\/\/192\.168\.1\.([1-9]|[1-9]\d):${clientPort}$/`),
    ],
    methods:['GET','POST']
  });
  app.useWebSocketAdapter(new SocketIOAdapter(app, configService));
  await app.listen(process.env.PORT);
}
bootstrap();
