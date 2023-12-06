import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/entities/user.entity';
import { PrivateMessage } from './entities/private-message.entity';
import { Contact } from './entities/contact.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { Notification } from 'src/notifications/entities/notification.entity';
import { baseUserFields } from 'src/common/user_common';
import { Block } from 'src/block/entities/block';
import { Friend } from 'src/friends/entities/friend';
import { RoomMessage } from './entities/room-message-entity';
import { SendRoomMessageDto } from './dto/send-room-message.dto';
import { Room } from 'src/rooms/entities/room';
import { RoomMessageTypes } from 'src/common/enums';
import { ReactionDto } from './dto/reaction.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatService {

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Notification.name) private NotificationModel: Model<Notification>,
    @InjectModel(PrivateMessage.name) private privateMessageModel: Model<PrivateMessage>,
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    @InjectModel(Block.name) private blockModel: Model<Block>,
    @InjectModel(Friend.name) private friendModel: Model<Friend>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) { }

  async getUserById(id: string): Promise<User | undefined> {
    return this.userModel.findOne({ _id: id }).select(`${baseUserFields} isPrivateLock isHiddenActivity`).exec();
  }

  async getUsersById(ids: string[]): Promise<User[]> {
    return this.userModel.find({ _id: { $in: ids } }).select(`${baseUserFields} isPrivateLock isHiddenActivity`).exec();
  }

  getUserFriends(userId: string): Promise<string[]> {
    return this.friendModel.find({ ownerId: userId }).distinct('userId').exec();
  }

  async getContacts(owner: string): Promise<Contact[]> {

    const [contacts, blockedUsers, friends] = await Promise.all([
      this.contactModel.find({ owner }).populate('user', `${baseUserFields} lastSeen isOnline isHiddenActivity`).populate('lastMessage').exec(),
      this.blockModel.find({ ownerId: owner }).distinct('userId').exec(),
      this.friendModel.find({ ownerId: owner }).distinct('userId').exec(),
    ]);

    if (contacts.length == 0) return [];

    const unSeenMessagesCountData = await this.privateMessageModel.aggregate([
      {
        $match: {
          'seenDate': null,
          'receiverId': owner,
          'isBlock': false,
          'senderId': { $in: contacts.map(e => e.user.id) },
        }
      },
      { $group: { _id: '$senderId', total: { $sum: 1 } }, }]);

    for (const contact of contacts) {
      contact.unSeenCount = 0;
      contact.isBlock = blockedUsers.includes(contact.user.id);

      if (contact.isBlock || contact.user.isHiddenActivity) {
        contact.user.isOnline = null;
        contact.user.lastSeen = null;
      }
      for (const unSeen of unSeenMessagesCountData) {
        if (unSeen._id == contact.user.id) {
          contact.unSeenCount = unSeen.total;
          break;
        }
      }
    }
    return contacts;
  }

  async getPrivateMessages(userId: string, contactId: string, page: number = 0): Promise<PrivateMessage[]> {
    if (page < 1) page = 1;

    const messages = await this.privateMessageModel.find({
      deleted: { $nin: userId },
      $or: [
        { senderId: userId, receiverId: contactId },
        { receiverId: userId, senderId: contactId, isBlock: false },
      ]
    })
      .sort({ 'createdAt': -1 })
      .limit(20).skip((page - 1) * 20)
      .populate('replayMessage')
      .exec();
    await this.getPrivateMessagesReactionUsers(messages);
    return messages;
  }

  async sendPrivateMessage(userId: string, language: string, sendMessageDto: SendMessageDto): Promise<PrivateMessage> {

    const [senderBlock, receiverBlock, user, friend] = await Promise.all([
      this.blockModel.findOne({ ownerId: userId, userId: sendMessageDto.to }).select('_id').exec(),
      this.blockModel.findOne({ ownerId: sendMessageDto.to, userId }).exec(),
      this.userModel.findById(sendMessageDto.to).select('isPrivateLock').exec(),
      this.friendModel.findOne({ ownerId: sendMessageDto.to, userId }).select('_id').exec(),
    ]);

    const isFriend = friend != null;
    const isBlockedByReceiver = receiverBlock != null;
    const isBlockedBySender = senderBlock != null;

    if (user.isPrivateLock && !isFriend) throw new BadRequestException('this user is lock his messages for friends only');

    if (isBlockedBySender) throw new BadRequestException('a message cannot be sent to a user you have blocked');

    if (sendMessageDto.text.startsWith('http') && sendMessageDto.text.endsWith('.mp3')) {
      sendMessageDto.media = [
        {
          type: 3,
          url: sendMessageDto.text,
        }
      ];
      sendMessageDto.text = '';
    }

    const messageObject = new this.privateMessageModel({
      senderId: userId,
      receiverId: sendMessageDto.to,
      text: sendMessageDto.text,
      media: sendMessageDto.media,
      isBlock: isBlockedByReceiver,
      replayMessage: sendMessageDto.replayMessage,
    });

    const message = await messageObject.save();
    if (sendMessageDto.replayMessage) {
      message.replayMessage = await this.privateMessageModel.findById(sendMessageDto.replayMessage).exec();
    }
    message.tempId = sendMessageDto.tempId;

    this.createContactIfNotExist(userId, sendMessageDto.to);
    this.contactModel.updateMany({ $or: [{ user: String(userId), owner: String(sendMessageDto.to) }, { owner: String(userId), user: String(sendMessageDto.to) }] }, { lastMessage: message.id }).exec();

    return message;
  }

  async sendRoomMessage(userId: string, language: string, sendRoomMessageDto: SendRoomMessageDto): Promise<RoomMessage | undefined> {

    const user = await this.userModel.findById(userId).select(baseUserFields).exec();
    if (!user) throw new BadRequestException('User Not Exist');


    if (sendRoomMessageDto.text.startsWith('http') && sendRoomMessageDto.text.endsWith('.mp3')) {
      sendRoomMessageDto.media = [
        {
          type: 3,
          url: sendRoomMessageDto.text,
        }
      ];
      sendRoomMessageDto.text = '';
    }
    return {
      id: randomUUID(),
      sender: user,
      text: sendRoomMessageDto.text,
      media: sendRoomMessageDto.media,
      roomId: sendRoomMessageDto.roomId,
      tempId: sendRoomMessageDto.tempId,
      createdAt: new Date(),
      type: RoomMessageTypes.normal,
      replayMessage: sendRoomMessageDto.replayMessage,
    };
  }

  async getRoomMembers(roomId: string): Promise<string[]> {
    const room = await this.roomModel.findById(roomId).populate('members', '_id').select('members').exec();

    return room.members.map(e => e.id) ?? [];
  }

  async setPrivateMessagesIsSeen(senderId: string, receiverId: string): Promise<string[]> {

    const result = await this.privateMessageModel.find({
      senderId,
      receiverId,
      seenDate: null,
      isBlock: false,
    }).distinct('_id').exec();

    this.privateMessageModel.updateMany({ _id: { $in: result } }, { seenDate: Date.now() }).exec();
    return result;
  }

  async setPrivateMessagesIsSent(messagesIds: string[]) {

    this.privateMessageModel.updateMany({ _id: { $in: messagesIds }, isBlock: false }, { sentDate: Date.now() }).exec();
  }

  async getPrivateMessagesIsNotSent(receiverId: string): Promise<PrivateMessage[]> {

    return this.privateMessageModel.find({ receiverId, sentDate: null, isBlock: false }).select('_id senderId').exec();
  }


  private async createContactIfNotExist(owner: string, user: string) {

    await Promise.all([this.contactModel.updateOne(
      { owner, user },
      { owner, user },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec(), this.contactModel.updateOne(
      { owner: user, user: owner },
      { owner: user, user: owner },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec()]);

  }

  async leaveRoom(userId: string, roomId: string): Promise<Room> {
    const result = await this.roomModel.findOneAndUpdate({
      _id: roomId,
    }, { $pull: { members: userId, admins: userId, owners: userId } }, { returnOriginal: false })
      .populate('creator', baseUserFields)
      .populate('messageOwner', baseUserFields)
      .populate('members', baseUserFields)
      .populate('owners', baseUserFields)
      .populate('admins', baseUserFields)
      .populate('banned', baseUserFields)
      .exec();

    this.userModel.updateOne({ _id: userId }, { $pull: { activeRooms: roomId, favoriteRooms: roomId } }).exec();
    return result;
  }

  async getContactsIds(userId: string): Promise<string[]> {
    return this.contactModel.find({ owner: userId }).distinct('user').exec();
  }

  async sendPrivateMessageNotification(message: PrivateMessage) { }

  addRoomToActive(roomId: string, userId: string) {
    this.userModel.updateOne({ _id: userId }, { $addToSet: { activeRooms: roomId } }).exec();
  }

  getRoomById(roomId: string): Promise<Room | undefined> {
    return this.roomModel.findById(roomId)
      .populate('creator', baseUserFields)
      .populate('messageOwner', baseUserFields)
      .populate('members', baseUserFields)
      .populate('owners', baseUserFields)
      .populate('admins', baseUserFields)
      .populate('banned', baseUserFields)
      .exec();
  }

  updateConnectionStatus(userId: string, status: boolean) {
    this.userModel.updateOne({ _id: userId }, status ? { isOnline: status } :
      { isOnline: status, lastSeen: Date.now() }
    ).exec();
  }

  getUnReadNotificationsCount(userId: string): Promise<number> {
    return this.NotificationModel.countDocuments({ ownerId: userId, isRead: false }).exec();
  }

  async privateMessageReaction(userId: string, reactionDto: ReactionDto): Promise<PrivateMessage> {
    const { messageId, type } = reactionDto;
    await this.privateMessageModel.updateOne({ _id: messageId }, { $pull: { reactions: { userId } } }).exec();
    if (reactionDto.type == null) {
      const message = await this.privateMessageModel.findById(messageId).exec();
      await this.getPrivateMessagesReactionUsers([message]);
      return message;
    }
    const message = await this.privateMessageModel.findOneAndUpdate({ _id: messageId }, { $addToSet: { reactions: { userId, type } } }, { returnOriginal: false }).exec();
    if (!message) throw new BadRequestException('Message Not Exist');
    await this.getPrivateMessagesReactionUsers([message]);
    return message;
  }

  async getUserActiveRooms(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId).select('activeRooms').exec();
    if (!user) return [];
    return user.activeRooms;
  }

  private async getPrivateMessagesReactionUsers(privateMessages: PrivateMessage[]) {
    const usersIds: string[] = [];

    for (const message of privateMessages) {
      if (message.reactions.length > 0) {
        for (const reaction of message.reactions) {
          const userId = reaction['userId'];
          if (!usersIds.includes(userId)) {
            usersIds.push(userId);
          }
        }
      }
    }
    if (usersIds.length == 0) return [];
    const users = await this.getUsersById(usersIds);
    for (const message of privateMessages) {
      if (message.reactions.length > 0) {
        for (const reaction of message.reactions) {
          const userId = reaction['userId'];
          for (const user of users) {
            if (user.id == userId) {
              reaction['user'] = user;
              break;
            }
          }
        }
      }
    }
  }
}
