import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as admin from 'firebase-admin';
import { Model } from 'mongoose';
import { NotificationTypes } from 'src/common/enums';
import { baseUserFields } from 'src/common/user_common';
import { User } from 'src/user/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { ChatGateway } from 'src/chat/chat-gateway';

@Injectable()
export class NotificationsService {

    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<Notification>,
        @InjectModel(User.name) private userModel: Model<User>,
        private chatGateway: ChatGateway,
    ) { }

    getNotifications(userId: string, page: number = 1): Promise<Notification[]> {
        if (page < 1) page = 1;
        return this.notificationModel.find({ ownerId: userId }).limit(20).skip((page - 1) * 20).populate('user', baseUserFields).exec();
    }

    getUnReadNotificationsCount(userId: string): Promise<number> {
        return this.notificationModel.countDocuments({ ownerId: userId, isRead: false }).exec();
    }

    async sendNotification(notificationData: NotificationData) {


        const [userData, existNotification] = await Promise.all([this.userModel.findById(notificationData.ownerId).select('fcm username').exec(), this.notificationModel.findOne({ ownerId: notificationData.ownerId, type: notificationData.type, user: notificationData.user, isRead: false }).select('_id').exec()]);

        if (!userData || existNotification) return;

        await (new this.notificationModel({ type: notificationData.type, ownerId: notificationData.ownerId, user: notificationData.user }).save());

        if (notificationData.fcm && userData.fcm.length > 0) {
            const message = {
                tokens: userData.fcm,
                notification: {
                    title: this.getNotificationTitle(notificationData.type),
                    body: this.getNotificationText(notificationData.type, userData.username),
                },
                data: {},
            };
            await admin.messaging().sendEachForMulticast(message);
        }

        this.sendNotificationsCount(notificationData.ownerId);
    }

    async deleteNotification(ownerId: string, userId: string, type: NotificationTypes) {

        await this.notificationModel.deleteMany({ ownerId: String(ownerId), user: String(userId), type }).exec();
        this.sendNotificationsCount(ownerId);
        // send update count
    }

    sendNotificationsCount(userId: string) {
        this.chatGateway.sendNotificationsCount(String(userId));
        this.chatGateway.sendUpdatedFriends(String(userId));
    }

    async readNotifications(userId: string, notificationId: string) {
        await this.notificationModel.updateOne({ _id: notificationId, ownerId: userId }, { isRead: true }).exec();
        this.sendNotificationsCount(userId);
    }

    private getNotificationTitle(type: NotificationTypes): string {
        switch (type) {
            case NotificationTypes.friendRequest:
                return 'New Friend Request';
        }
        return '';
    }

    private getNotificationText(type: NotificationTypes, username?: string): string {
        switch (type) {
            case NotificationTypes.friendRequest:
                return `New Friend Request from ${username ?? ''}`;
        }
        return '';
    }
}

interface NotificationData {
    ownerId: string;
    type: NotificationTypes;
    user: string;
    fcm: boolean;
}