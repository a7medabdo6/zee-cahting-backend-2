import { Body, Controller, Post, UseGuards, Headers, Get, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PrivateMessage } from './entities/private-message.entity';
import { ChatGateway } from './chat-gateway';
import { Contact } from './entities/contact.entity';
import { UserGuard } from 'src/common/user_guard';
import { UserAuth } from 'src/common/user_auth';
import { UserJwt } from 'src/common/user_decorate';
import { SendRoomMessageDto } from './dto/send-room-message.dto';

@Controller('chat')
@UseGuards(UserGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway) { }



  @Post('send-private-message')
  async sendPrivateMessage(@UserJwt() userAuth: UserAuth, @Headers('Language') language: string, @Body() sendMessageDto: SendMessageDto) {
    const message = await this.chatService.sendPrivateMessage(userAuth.id, language, sendMessageDto);
    if (!message.isBlock) {
      const isOnline = await this.chatGateway.isUserOnline(message.receiverId);
      if (isOnline) {
        message.sentDate = new Date();
        this.chatGateway.sendPrivateMessage(message, message.receiverId);
        this.chatService.setPrivateMessagesIsSent([message.id]);
      } else {
        this.chatService.sendPrivateMessageNotification(message);
      }
      this.chatGateway.sendPrivateMessage(message, userAuth.id);
    }
    return message;
  }

  @Post('send-room-message')
  async sendRoomMessage(@UserJwt() userAuth: UserAuth, @Headers('Language') language: string, @Body() senRoomMessageDto: SendRoomMessageDto) {
    const message = await this.chatService.sendRoomMessage(userAuth.id, language, senRoomMessageDto);

    this.chatGateway.sendRoomMessage(message);
    return message;
  }

  @Get('contacts')
  getContacts(@UserJwt() userAuth: UserAuth): Promise<Contact[]> {
    this.chatService.getPrivateMessagesIsNotSent(userAuth.id).then(messages => {
      if (messages.length > 0) {
        this.chatService.setPrivateMessagesIsSent(messages.map(e => e.id));

        const users: Object = {};
        for (const message of messages) {
          if (users[message.senderId] == null) users[message.senderId] = [];
          users[message.senderId].push(message.id);
        }

        Object.entries(users).forEach(entry => {
          const [userId, messagesIds] = entry;
          this.chatGateway.sendPrivateMessagesIsSent(userId, userAuth.id, messagesIds);
        });
      }
    });

    return this.chatService.getContacts(userAuth.id);
  }

  @Get('private-messages/:id')
  async getPrivateMessages(@UserJwt() userAuth: UserAuth, @Param('id') contactId: string, @Query('page') page: number): Promise<PrivateMessage[]> {
    if (page == 1) {
      const messagesIds = await this.chatService.setPrivateMessagesIsSeen(contactId, userAuth.id);
      await this.chatGateway.sendPrivateMessagesIsSeen(contactId, userAuth.id, messagesIds);
    }
    return this.chatService.getPrivateMessages(userAuth.id, contactId, page);
  }

  @Post('set-private-seen/:id')
  async setPrivateSent(@UserJwt() userAuth: UserAuth, @Param('id') contactId: string) {

    const messagesIds = await this.chatService.setPrivateMessagesIsSeen(contactId, userAuth.id);
    await this.chatGateway.sendPrivateMessagesIsSeen(contactId, userAuth.id, messagesIds);

    return;
  }
}
