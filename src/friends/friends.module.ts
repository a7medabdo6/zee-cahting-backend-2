import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Friend, FriendSchema } from './entities/friend';
import { Block, BlockSchema } from 'src/block/entities/block';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Friend.name, schema: FriendSchema },
      { name: Block.name, schema: BlockSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule { }
