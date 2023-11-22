import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/user/entities/user.entity';
import { baseUserFields, checkIsUserBlocked } from 'src/common/user_common';
import { Friend } from './entities/friend';
import { Block } from 'src/block/entities/block';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationTypes } from 'src/common/enums';

@Injectable()
export class FriendsService {

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Friend.name) private friendModel: Model<Friend>,
    @InjectModel(Block.name) private blockModel: Model<Block>,
    private notificationsService: NotificationsService,
  ) { }

  async getFriends(userId: string, page: number = 1): Promise<Friend[]> {

    if (page < 1) page = 1;

    const friends = await this.friendModel.find({ ownerId: userId, isAccepted: true }).limit(20).skip((page - 1) * 20).select('userId createdAt').exec();

    if (friends.length == 0) return [];

    const users = await this.userModel.find({ _id: { $in: friends.map(e => e.userId) } }).select(`${baseUserFields} isOnline isHiddenActivity isPrivateLock`).exec();

    for (const friend of friends) {
      for (const user of users) {
        user.isOnline = user.isHiddenActivity ? null : user.isOnline;
        if (user.id == friend.userId) {
          friend.user = user;
          break;
        }
      }
    }
    const result = friends.filter(e => e.user);

    return result;
  }

  async searchFriends(userId: string, query: string): Promise<User[]> {

    const friends = await this.friendModel.find({ ownerId: userId, isAccepted: true }).limit(200).select('userId createdAt').exec();

    if (friends.length == 0) return [];

    return this.userModel.find({ _id: { $in: friends.map(e => e.userId) }, username: { $regex: query, $options: 'i' }, }).select(baseUserFields).exec();
  }

  async getFriendRequests(userId: string, page: number = 1): Promise<Friend[]> {

    if (page < 1) page = 1;
    const friends = await this.friendModel.find({ userId, isAccepted: false }).limit(20).skip((page - 1) * 20).select('ownerId createdAt').exec();

    if (friends.length == 0) return [];

    const users = await this.userModel.find({ _id: { $in: friends.map(e => e.ownerId) } }).select(baseUserFields).exec();

    for (const friend of friends) {
      for (const user of users) {
        if (user.id == friend.ownerId) {
          friend.user = user;
          break;
        }
      }
    }
    return friends.filter(e => e.user);
  }

  async sendFriendRequest(targetUserId: string, userId: string) {

    if (targetUserId == userId) throw new BadRequestException('you can not add yourself');

    const isBlock = await checkIsUserBlocked(this.blockModel, userId, targetUserId);

    if (isBlock) throw new BadRequestException('the user is not exist');

    const isFriend = await this.friendModel.findOne({ ownerId: userId, userId: targetUserId }).exec();

    if (isFriend && !isFriend.isAccepted) throw new BadRequestException('you already sent a friend request to this user');
    if (isFriend) throw new BadRequestException('the user is already in friends list');

    await this.friendModel.updateOne({ ownerId: userId, userId: targetUserId, isAccepted: false }, { ownerId: userId, userId: targetUserId, isAccepted: false }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();

    // send notification to target user id

    this.notificationsService.sendNotification(
      {
        ownerId: targetUserId,
        type: NotificationTypes.friendRequest,
        user: userId,
        fcm: true,
      }
    );
    return 'friend request sent';
  }

  async acceptFriendRequest(targetUserId: string, userId: string) {

    if (targetUserId == userId) throw new BadRequestException('you can not add yourself');
    this.notificationsService.deleteNotification(userId, targetUserId, NotificationTypes.friendRequest);

    const isFriend = await this.friendModel.findOneAndUpdate({ ownerId: targetUserId, userId }, { isAccepted: true }).exec();

    if (!isFriend) throw new BadRequestException('can not find friend request');

    if (isFriend.isAccepted) throw new BadRequestException('the user is already in friends list');

    await this.friendModel.updateOne({ ownerId: userId, userId: targetUserId }, { ownerId: userId, userId: targetUserId, isAccepted: true }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();

    // send notification to user id

    this.sendUpdatedFriends(userId);
    this.sendUpdatedFriends(targetUserId);
    return 'user added to friends list';
  }

  async deleteFriend(targetUserId: string, userId: string) {

    if (targetUserId == userId) throw new BadRequestException('you can not remove yourself');

    // const existFriend = await this.friendModel.findOneAndDelete({ ownerId: userId, userId: targetUserId, isAccepted: true }).exec();

    this.notificationsService.deleteNotification(userId, targetUserId, NotificationTypes.friendRequest);

    // if (!existFriend) throw new BadRequestException('the user is not exist in friends list');

    await this.friendModel.findOneAndDelete({ ownerId: targetUserId, userId }).exec();
    await this.friendModel.findOneAndDelete({ ownerId: userId, userId: targetUserId }).exec();
    // send notify socket

    this.sendUpdatedFriends(userId);
    this.sendUpdatedFriends(targetUserId);
    return 'user deleted from friends list';
  }

  async cancelFriendRequest(targetUserId: string, userId: string) {

    if (targetUserId == userId) throw new BadRequestException('you can not remove yourself');

    this.notificationsService.deleteNotification(userId, targetUserId, NotificationTypes.friendRequest);

    const result = await this.friendModel.findOneAndDelete({ ownerId: targetUserId, userId, isAccepted: false }).exec();

    return result ? 'friend request canceled' : 'friend request not found';
  }

  private async sendUpdatedFriends(userId: string) {
    this.notificationsService.sendNotificationsCount(userId);
  }
}
