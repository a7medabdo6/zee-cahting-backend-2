import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { Friend, FriendSchema } from 'src/friends/entities/friend';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Friend.name, schema: FriendSchema }
    ]),
    ChatModule,
  ],
  controllers: [UserController],
  providers: [
    UserService]
})
export class UserModule { }
