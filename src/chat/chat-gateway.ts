import { Injectable, Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer, WsResponse } from "@nestjs/websockets";
import { SocketWithAuth } from "./common/types";
import { Namespace } from 'socket.io';
import { ChatService } from "./chat.service";
import { PrivateMessage } from "./entities/private-message.entity";
import { RoomMessage } from "./entities/room-message-entity";
import { Room } from "src/rooms/entities/room";
import { RoomMessageTypes } from "src/common/enums";
import { User } from "src/user/entities/user.entity";

@WebSocketGateway({
    transports: ['websocket'],
    cors: {
        origin: '*',
    },
})
@Injectable()
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    constructor(private readonly chatService: ChatService) { }

    private readonly logger = new Logger(ChatGateway.name);

    @WebSocketServer()
    io: Namespace;


    afterInit(): void {
        this.logger.log(`Websocket Gateway initialized.`);
    }

    async handleConnection(client: SocketWithAuth) {

        await client.join(client.userId);
        this.sendNotificationsCount(String(client.userId));

        this.io.in(client.userId).fetchSockets().then(result => {
            if (result.length == 1) {
                this.chatService.updateConnectionStatus(client.userId, true);
                this.sendUserOnlineStatusToContacts(client.userId, true);
            }
        })

        this.logger.debug(`${client.userName} = ${client.userId} Connected.`);
    }

    async handleDisconnect(client: SocketWithAuth) {

        await client.leave(client.userId);

        this.logger.debug(`${client.userName} Disconnected.`);

        this.io.in(client.userId).fetchSockets().then(result => {
            if (result.length == 0) {
                this.chatService.updateConnectionStatus(client.userId, false);
                this.sendUserOnlineStatusToContacts(client.userId, false);
            }
        })
        for (const room of client.currentRooms) {
            await client.leave(room);
            this.sendCustomRoomMessage(
                room,
                client.userId,
                RoomMessageTypes.leave,
            )
        }
        if (client.currentWritingUser) {
            this.sendWritingMessage(client.userId, client.currentWritingUser, false);
        }
    }

    async isUserOnline(userId: string): Promise<boolean> {
        const result = await this.io.in(userId).fetchSockets();
        return result.length > 0;
    }

    async sendPrivateMessage(privateMessage: PrivateMessage, userId: string) {

        this.io.to(userId).emit('new-private-message', privateMessage);
    }

    async sendRoomMessage(roomMessage: RoomMessage) {

        this.io.to(roomMessage.roomId).emit('new-room-message', roomMessage);
    }

    async sendUpdatedRoom(room: Room) {

        room.online = await this.getOnlineUsers(String(room.id));
        this.io.to(room.id).emit('update-room', room);
    }

    async sendUpdatedRoomToUser(userId: string, room: Room) {
        room.online = await this.getOnlineUsers(String(room.id));
        this.io.to(userId).emit('update-room', room);
    }

    async sendPrivateMessagesIsSent(senderId: string, receiverId: string, messagesIds: string[]) {

        this.io.to(senderId).emit('private-messages-is-sent', { userId: receiverId, messagesIds });
    }

    async sendRefreshContacts(userId: string) {

        this.io.to(userId).emit('refresh-contacts', '');
    }

    async sendPrivateMessagesIsSeen(senderId: string, receiverId: string, messagesIds: string[]) {

        this.io.to(senderId).emit('private-messages-is-seen', { userId: receiverId, messagesIds });
    }

    async sendUserOnlineStatusToContacts(userId: string, status: boolean) {

        const [user, friends, contacts] = await Promise.all([
            this.chatService.getUserById(String(userId)),
            this.chatService.getUserFriends(String(userId)),
            this.chatService.getContactsIds(userId),
        ])

        for (const contact of contacts) {
            this.io.to(contact).emit('user-online-status', { userId, status: user.isHiddenActivity ? null : status, lastSeen: user.isHiddenActivity ? null : Date.now() });
        }
        for (const friend of friends) {
            if (!contacts.includes(friend)) {
                this.io.to(friend).emit('user-online-status', { userId, status: user.isHiddenActivity ? null : status, lastSeen: user.isHiddenActivity ? null : Date.now() });
            }
        }
    }

    async sendUpdatedFriends(userId: string) {
        this.io.to(userId).emit('update-friends', {});
    }

    async sendNotificationsCount(userId: string) {
        const count = await this.chatService.getUnReadNotificationsCount(userId);
        this.io.to(userId).emit('notifications-count', { count });
    }

    sendUserKicked(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('user-kicked', { roomId, roomName });
    }

    sendUserBanned(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('user-banned', { roomId, roomName });
    }
    sendUserUnBanned(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('un-ban', { roomId, roomName });
    }
    sendUserAdmin(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('set-admin', { roomId, roomName });
    }
    sendUserRemoveAdmin(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('remove-admin', { roomId, roomName });
    }
    sendUserRemoveMember(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('remove-member', { roomId, roomName });
    }
    sendUserOwner(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('set-owner', { roomId, roomName });
    }
    sendUserRemoveOwner(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('remove-owner', { roomId, roomName });
    }

    sendUserMember(userId: string, roomId: string, roomName: string) {
        this.io.to(userId).emit('set-member', { roomId, roomName });
    }

    sendWritingMessage(userId: string, targetUserId: string, status: boolean) {
        this.io.to(targetUserId).emit('writing-message', { userId, status });
    }

    async getOnlineUsers(roomId: string): Promise<User[]> {
        const sockets = await this.io.in(roomId).fetchSockets();
        if (sockets.length == 0) return [];

        return this.chatService.getUsersById(sockets.map(e => (e as unknown as SocketWithAuth).userId));
    }

    private async sendRoomMembersCount(roomId: string) {
        const users = await this.getOnlineUsers(roomId);
        const sockets = await this.io.fetchSockets();
        for (const client of sockets) {
            client.emit('room-members-count', { 'id': roomId, online: users });
        }
        //this.sendToRoomUsers(roomId, 'room-members-count', { 'id': roomId, count })
    }

    @SubscribeMessage('join-room')
    async joinRoom(@MessageBody('roomId') roomId: string, @ConnectedSocket() client: SocketWithAuth, @MessageBody('enter') enterRoom: boolean, @MessageBody('password') password?: string): Promise<WsResponse<any>> {

        const room = await this.chatService.getRoomById(roomId);

        if (!room) {
            return { event: 'join-room', data: { 'id': roomId, 'name': room.name, 'status': 'notExist' } }
        }

        const isMember = room.members.filter(e => String(e.id) == client.userId).length != 0;

        if (room.banned.every(b => b.id != client.userId) == false) {
            return { event: 'join-room', data: { 'id': roomId, 'name': room.name, 'status': 'banned' } };
        }
        if (!isMember && room.membersOnly == true) {
            return { event: 'join-room', data: { 'id': roomId, 'name': room.name, 'status': 'members-only' } };
        }
        if (!isMember && room.password && room.password.length > 0 && room.password != password) {
            return { event: 'join-room', data: { 'id': roomId, 'name': room.name, 'status': 'invalid-password' } };
        }

        var users = await this.getOnlineUsers(roomId);

        if (users.length < 50 || room.creator.id == client.userId || client.currentRooms.includes(roomId)) {
            if (!client.currentRooms.includes(roomId)) {
                client.currentRooms.push(roomId);
                this.sendCustomRoomMessage(roomId, client.userId, RoomMessageTypes.join);
            }
            await client.join(roomId);
            this.chatService.addRoomToActive(roomId, client.userId);
            this.sendRoomMembersCount(roomId);
            users = await this.getOnlineUsers(roomId);
            return { event: 'join-room', data: { 'room': { ...room.toJSON(), 'online': users }, 'status': 'success', 'enter': enterRoom } };

        } else {
            return { event: 'join-room', data: { 'id': roomId, 'name': room.name, 'status': 'full' } };
        }
    }

    @SubscribeMessage('leave-room')
    async leaveRoom(@MessageBody('roomId') roomId: string, @ConnectedSocket() client: SocketWithAuth): Promise<WsResponse<any>> {

        Logger.log('Leave Group', roomId, client.userId);
        await client.leave(roomId);
        this.sendCustomRoomMessage(roomId, client.userId, RoomMessageTypes.leave);
        const index = client.currentRooms.indexOf(roomId, 0);
        if (index > -1) {
            client.currentRooms.splice(index, 1);
        }
        const room = await this.chatService.leaveRoom(client.userId, roomId);
        this.sendUpdatedRoom(room);
        this.sendRoomMembersCount(roomId);

        return {
            event: 'leave-room', data: { roomId, roomName: room.name },
        };
    }

    @SubscribeMessage('writing-message')
    async onWritingMessage(@MessageBody('userId') userId: string, @MessageBody('status') status: boolean, @ConnectedSocket() client: SocketWithAuth) {
        client.currentWritingUser = status ? userId : null;
        this.sendWritingMessage(client.userId, userId, status);
    }

    private async sendCustomRoomMessage(roomId: string, userId: string, roomMessageType: RoomMessageTypes) {

        const user = await this.chatService.getUserById(userId);
        if (!user) return;

        this.sendRoomMessage(
            {
                sender: user,
                roomId,
                type: roomMessageType,
                text: '',
                media: [],
                createdAt: new Date(),
            },
        )
    }

    async removeUserFromRoomListeners(roomId: string, userId: string) {
        const sockets = await this.io.in(userId).fetchSockets();
        for (const socket of sockets) {
            const client = socket as unknown as SocketWithAuth;
            socket.leave(roomId);
            const index = client.currentRooms.indexOf(roomId, 0);
            if (index > -1) {
                client.currentRooms.splice(index, 1);
            }
        }
    }

    async createRoom(roomId: string, userId: string) {

        const sockets = await this.io.in(userId).fetchSockets();
        for (const socket of sockets) {
            const client = socket as unknown as SocketWithAuth;
            socket.join(roomId);
            const index = client.currentRooms.indexOf(roomId, 0);
            if (index == -1) {
                client.currentRooms.push(roomId);
            }
        }
        this.sendCustomRoomMessage(roomId, userId, RoomMessageTypes.create);
    }
}
