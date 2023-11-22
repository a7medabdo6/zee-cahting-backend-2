import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { UserAuth } from 'src/common/user_auth';
import { UserJwt } from 'src/common/user_decorate';
import { UserGuard } from 'src/common/user_guard';
import { ParseObjectIdPipe } from 'src/common/parse_object_id_pipe';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ChatGateway } from 'src/chat/chat-gateway';
import { RoomActionDto } from './dto/room-action.dto';

@Controller('rooms')
@UseGuards(UserGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService,
    private readonly chatGateway: ChatGateway
  ) { }


  @Post('create')
  async createRoom(@UserJwt() userAuth: UserAuth, @Body('name') name: string) {
    const room = await this.roomsService.createRoom(userAuth.id, name);
    await this.chatGateway.createRoom(String(room.id), userAuth.id);
    return room;
  }

  @Get('public')
  async getPublicRooms(@UserJwt() userAuth: UserAuth, @Query('page') page: number) {
    const rooms = await this.roomsService.getPublicRooms(userAuth.id, page);
    for (const room of rooms) {
      room.online = await this.chatGateway.getOnlineUsers(room.id);
    }
    return rooms;
  }

  @Get('active')
  async getActiveRooms(@UserJwt() userAuth: UserAuth) {
    const rooms = await this.roomsService.getActiveRooms(userAuth.id);
    for (const room of rooms) {
      room.online = await this.chatGateway.getOnlineUsers(room.id);
    }
    return rooms;
  }

  @Get('favorite')
  async getFavoriteRooms(@UserJwt() userAuth: UserAuth) {
    const rooms = await this.roomsService.getFavoriteRooms(userAuth.id);
    for (const room of rooms) {
      room.online = await this.chatGateway.getOnlineUsers(room.id);
    }
    return rooms;
  }

  @Post('favorite')
  addFavorite(@UserJwt() userAuth: UserAuth, @Body('roomId', ParseObjectIdPipe) roomId: string) {
    return this.roomsService.addFavorite(userAuth.id, String(roomId));
  }

  @Delete('favorite')
  roomFromFavorite(@UserJwt() userAuth: UserAuth, @Body('roomId', ParseObjectIdPipe) roomId: string) {
    return this.roomsService.removeFromFavorite(userAuth.id, String(roomId));
  }

  @Patch('update')
  async updateRoom(@UserJwt() userAuth: UserAuth, @Body() updateRoomDto: UpdateRoomDto) {
    const room = await this.roomsService.updateRoom(userAuth.id, updateRoomDto);
    this.chatGateway.sendUpdatedRoom(room);
    return room;
  }

  @Post('search')
  async search(@UserJwt() userAuth: UserAuth, @Body('query') query) {
    const rooms = await this.roomsService.search(query, userAuth.id);
    for (const room of rooms) {
      room.online = await this.chatGateway.getOnlineUsers(room.id);
    }
    return rooms;
  }

  @Post('add-member')
  async addUserMember(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.addUserMember(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUpdatedRoomToUser(roomActionDto.userId, room);
      this.chatGateway.sendUserMember(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User is Member';
  }
  @Post('kick')
  async kickUser(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.kickUser(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    await this.chatGateway.removeUserFromRoomListeners(roomActionDto.roomId, roomActionDto.userId);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUpdatedRoomToUser(roomActionDto.userId, room);
      this.chatGateway.sendUserKicked(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User kicked';
  }

  @Post('ban')
  async banUser(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.banUser(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    await this.chatGateway.removeUserFromRoomListeners(roomActionDto.roomId, roomActionDto.userId);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUpdatedRoomToUser(roomActionDto.userId, room);
      this.chatGateway.sendUserBanned(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Banned';
  }

  @Post('un-ban')
  async unBanUser(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.unBanUser(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUpdatedRoomToUser(roomActionDto.userId, room);
      this.chatGateway.sendUserUnBanned(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Un Banned';
  }

  @Post('set-owner')
  async setUserOwner(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.setUserOwner(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUserOwner(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Become Owner';
  }

  @Post('remove-owner')
  async removeUserOwner(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.removeUserOwner(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUserRemoveOwner(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Remove Owner';
  }

  @Post('set-admin')
  async setUserAdmin(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.setUserAdmin(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUserAdmin(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Become Admin';
  }

  @Post('remove-admin')
  async removeUserAdmin(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.removeUserAdmin(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUserRemoveAdmin(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Remove Admin';
  }

  @Post('remove-member')
  async removeMember(@UserJwt() userAuth: UserAuth, @Body() roomActionDto: RoomActionDto) {
    const message = await this.roomsService.removeMember(userAuth.id, roomActionDto);
    this.chatGateway.sendRoomMessage(message);
    this.roomsService.getRoomById(roomActionDto.roomId).then(room => {
      this.chatGateway.sendUpdatedRoom(room);
      this.chatGateway.sendUserRemoveMember(roomActionDto.userId, roomActionDto.roomId, room.name);
    });
    return 'User Remove Admin';
  }
}
