import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat-gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Notification, NotificationSchema } from 'src/notifications/entities/notification.entity';
import { Block, BlockSchema } from 'src/block/entities/block';
import { Friend, FriendSchema } from 'src/friends/entities/friend';
import { Contact, ContactSchema } from './entities/contact.entity';
import { PrivateMessage, PrivateMessageSchema } from './entities/private-message.entity';
import { Room, RoomSchema } from 'src/rooms/entities/room';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PrivateMessage.name, schema: PrivateMessageSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Block.name, schema: BlockSchema },
      { name: Friend.name, schema: FriendSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  exports: [ChatGateway]
})
export class ChatModule { }
