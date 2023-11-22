import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { JwtModule } from '@nestjs/jwt';
import { FriendsModule } from './friends/friends.module';
import { BlockModule } from './block/block.module';
import { RoomsModule } from './rooms/rooms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().required(),
        JWT_SECRET_KEY: Joi.string().required(),
        CRYPT_SECRET_KEY: Joi.string().required(),
      }),
    }),
    JwtModule.register({
      global : true,
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '1000000y' },
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule, UserModule, FriendsModule, BlockModule, RoomsModule, NotificationsModule, ChatModule, UploadModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
