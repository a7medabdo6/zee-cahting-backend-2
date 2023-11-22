import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Room } from './entities/room';
import { Model } from 'mongoose';
import { baseUserFields } from 'src/common/user_common';
import { User } from 'src/user/entities/user.entity';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomMessage } from 'src/chat/entities/room-message-entity';
import { RoomMessageTypes } from 'src/common/enums';
import { RoomActionDto } from './dto/room-action.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  async createRoom(userId: string, name?: string): Promise<Room> {
    if (!name || name.length == 0) throw new BadRequestException('Name is required');

    const existGroup = await this.roomModel.findOne({ name }).select('_id').exec();

    if (existGroup) {
      throw new BadRequestException('Room Name already exist');
    }

    const savedRoom = await (new this.roomModel({ name, ownerId: userId, creator: userId, members: [userId] })).save();

    savedRoom.online = [];
    savedRoom.messageOwner = null;
    //await (new this.roomMessageModel({ sender: userId, type: RoomMessageTypes.create, roomId: savedRoom.id })).save();

    return this.getRoomById(savedRoom.id);
  }

  async getPublicRooms(userId: string, page: number): Promise<Room[]> {
    if (page < 1) page = 1;
    const [rooms, favoriteRooms] = await Promise.all([
      this.roomModel.find({
        //membersOnly: false,
        // banned: { $nin: userId }
      }).sort({ createdAt: -1 })
        .limit(20).skip((page - 1) * 20)
        .populate('creator', baseUserFields)
        .populate('messageOwner', baseUserFields)
        .populate('members', baseUserFields)
        .populate('owners', baseUserFields)
        .populate('admins', baseUserFields)
        .populate('banned', baseUserFields)
        .exec(),
      this.userModel.findById(userId).select('favoriteRooms').exec(),
    ]);

    const favoriteRoomIds = favoriteRooms.favoriteRooms ?? [];

    for (const room of rooms) {
      room.isFavorite = favoriteRoomIds.includes(room.id);
    }

    return rooms;
  }

  async getActiveRooms(userId: string): Promise<Room[]> {


    const [joinedRooms, user] = await Promise.all([
      this.roomModel.find({ members: { $in: [userId] } }).select('_id').exec(),
      this.userModel.findById(userId).select('favoriteRooms activeRooms').exec(),
    ])

    if (user.activeRooms.length == 0 && joinedRooms.length == 0) return [];

    const roomId: string[] = [...user.activeRooms];

    for (const joinedRoom of joinedRooms) {
      if (!roomId.includes(joinedRoom.id)) {
        roomId.push(joinedRoom.id);
      }
    }
    const rooms = await
      this.roomModel.find({ _id: { $in: roomId } })
        .populate('creator', baseUserFields)
        .populate('messageOwner', baseUserFields)
        .populate('members', baseUserFields)
        .populate('owners', baseUserFields)
        .populate('admins', baseUserFields)
        .populate('banned', baseUserFields)
        .exec();

    // const favoriteRoomIds = (user.favoriteRooms ?? []).map(e=> String(e));

    // for (const room of rooms) {
    //   room.isFavorite = favoriteRoomIds.includes(room.id);
    // }
    return rooms;
  }

  async getFavoriteRooms(userId: string): Promise<Room[]> {


    const user = await this.userModel.findById(userId).select('favoriteRooms').exec();


    if (user.favoriteRooms.length == 0) return [];

    const rooms = await
      this.roomModel.find({ _id: { $in: user.favoriteRooms } })
        .populate('creator', baseUserFields)
        .populate('messageOwner', baseUserFields)
        .populate('members', baseUserFields)
        .populate('owners', baseUserFields)
        .populate('admins', baseUserFields)
        .populate('banned', baseUserFields)
        .exec();

    return rooms;
  }

  async addFavorite(userId: string, roomId: string): Promise<void> {
    this.userModel.updateOne({ _id: userId }, { $addToSet: { favoriteRooms: roomId } }).exec();
  }

  removeFromFavorite(userId: string, roomId: string) {
    this.userModel.updateOne({ _id: userId }, { $pull: { favoriteRooms: roomId } }).exec();
  }

  async updateRoom(userId: string, updateRoom: UpdateRoomDto): Promise<Room> {

    const result = await this.roomModel.findOneAndUpdate({
      _id: updateRoom.roomId, $or: [
        { creator: userId },
        { owners: { $in: [userId] } },
      ]
    }, updateRoom, { returnOriginal: false })
      .populate('creator', baseUserFields)
      .populate('messageOwner', baseUserFields)
      .populate('members', baseUserFields)
      .populate('owners', baseUserFields)
      .populate('admins', baseUserFields)
      .populate('banned', baseUserFields)
      .exec();

    if (!result) throw new BadRequestException('Room not found or you are not the creator or owner');

    return result;
  }

  async addUserMember(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findById(roomActionDto.userId).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        members: { $nin: [roomActionDto.userId] },
        banned: { $nin: [roomActionDto.userId] },
        $or: [
          { creator: userId },
          { owners: { $in: [userId] } },
          { admins: { $in: [userId] } },
        ],
      }, { $addToSet: { members: roomActionDto.userId } }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('User is Already a Member or is banned or you are not the creator or owner or Admin');

    this.userModel.updateOne({ _id: roomActionDto.userId }, { $addToSet: { activeRooms: roomActionDto.roomId, favoriteRooms: roomActionDto.roomId } }).exec();
    return {
      sender: user,
      type: RoomMessageTypes.becomeMember,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async kickUser(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findByIdAndUpdate({ _id: roomActionDto.userId }, { $pull: { favoriteRooms: roomActionDto.roomId, activeRooms: roomActionDto.roomId } }).select('username').exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');

    return {
      sender: user,
      type: RoomMessageTypes.kick,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async removeMember(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findById(roomActionDto.userId).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        members: { $in: [roomActionDto.userId] },
        $or: [
          { creator: userId },
          { owners: { $in: [userId] } },
          { admins: { $in: [userId] } },
        ],
      }, { $pull: { members: roomActionDto.userId } }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');

    if (!room) throw new BadRequestException('User is Already is not a Member or you are not the creator or owner or Admin');

    return {
      sender: user,
      type: RoomMessageTypes.removeMember,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }


  async banUser(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findByIdAndUpdate({ _id: roomActionDto.userId }, { $pull: { favoriteRooms: roomActionDto.roomId, activeRooms: roomActionDto.roomId } }).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        banned: { $nin: roomActionDto.userId },
        $or: [
          { creator: userId },
          { owners: { $in: [userId] } },
          { admins: { $in: [userId] } },
        ],
      }, {
        $pull: { members: roomActionDto.userId, owners: roomActionDto.userId, admins: roomActionDto.userId },
        $addToSet: {
          banned: roomActionDto.userId
        }
      }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('User is Already Banned or you are not the creator or owner or Admin');

    return {
      sender: user,
      type: RoomMessageTypes.banned,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async unBanUser(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findById(roomActionDto.userId).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        banned: { $in: roomActionDto.userId },
        $or: [
          { creator: userId },
          { owners: { $in: [userId] } },
          { admins: { $in: [userId] } },
        ],
      }, {
        $pull: {
          banned: roomActionDto.userId
        }
      }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('User is Already Un Banned or you are not the creator or owner or Admin');

    return {
      sender: user,
      type: RoomMessageTypes.unbanned,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async setUserAdmin(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findOneAndUpdate({ _id: roomActionDto.userId }, { $addToSet: { activeRooms: roomActionDto.roomId } }).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        $or: [
          { creator: userId },
          { owners: { $in: [userId] } },
        ],
      }, {
        $addToSet: {
          members: roomActionDto.userId,
          admins: roomActionDto.userId,
        }, $pull: {
          owners: roomActionDto.userId,
        },
      }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('you are not the creator or owner');

    return {
      sender: user,
      type: RoomMessageTypes.becomeAdmin,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async setUserOwner(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findOneAndUpdate({ _id: roomActionDto.userId }, { $addToSet: { activeRooms: roomActionDto.roomId } }).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        creator: userId,
      }, {
        $addToSet: {
          members: roomActionDto.userId,
          owners: roomActionDto.userId,
        },
        $pull: {
          admins: roomActionDto.userId,
        },
      }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('you are not the creator');

    return {
      sender: user,
      type: RoomMessageTypes.becomeOwner,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async removeUserAdmin(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findById(roomActionDto.userId).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        admins: { $in: roomActionDto.userId },
        $or: [
          { creator: userId },
          { owners: { $in: [userId] } },
        ],
      }, {
        $pull: {
          admins: roomActionDto.userId,
          owners: roomActionDto.userId,
          members: roomActionDto.userId,
        }
      }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('User is Already not a Admin or you are not the creator or owner');

    return {
      sender: user,
      type: RoomMessageTypes.removeAdmin,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  async removeUserOwner(userId: string, roomActionDto: RoomActionDto): Promise<RoomMessage> {

    const [user, member, room] = await Promise.all([
      this.userModel.findById(userId).select(baseUserFields).exec(),
      this.userModel.findById(roomActionDto.userId).select('username').exec(),
      this.roomModel.findOneAndUpdate({
        _id: roomActionDto.roomId,
        owners: { $in: roomActionDto.userId },
        creator: userId,
      }, {
        $pull: {
          owners: roomActionDto.userId,
          admins: roomActionDto.userId,
          members: roomActionDto.userId,
        }
      }).exec(),
    ]);

    if (!user || !member) throw new BadRequestException('User not found');
    if (!room) throw new BadRequestException('User is Already not a Owner or you are not the creator');

    return {
      sender: user,
      type: RoomMessageTypes.removeOwner,
      roomId: roomActionDto.roomId,
      text: member.username,
      createdAt: new Date(),
      media: [],
    };
  }

  getRoomById(roomId: string): Promise<Room> {
    return this.roomModel.findById(roomId)
      .populate('creator', baseUserFields)
      .populate('messageOwner', baseUserFields)
      .populate('members', baseUserFields)
      .populate('owners', baseUserFields)
      .populate('admins', baseUserFields)
      .populate('banned', baseUserFields)
      .exec();
  }

  async search(query: string, userId: string): Promise<Room[]> {
    return this.roomModel.find({ name: { $regex: query, $options: 'i' }, banned: { $nin: userId } })
      .populate('creator', baseUserFields)
      .populate('messageOwner', baseUserFields)
      .populate('members', baseUserFields)
      .populate('owners', baseUserFields)
      .populate('admins', baseUserFields)
      .populate('banned', baseUserFields)
      .exec();
  }
}
