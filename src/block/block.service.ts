import { BadRequestException, Injectable } from '@nestjs/common';
import { Block } from './entities/block';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { baseUserFields } from 'src/common/user_common';
import { User } from 'src/user/entities/user.entity';
import { Friend } from 'src/friends/entities/friend';

@Injectable()
export class BlockService {

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Block.name) private blockModel: Model<Block>,
    @InjectModel(Block.name) private friendModel: Model<Friend>,
  ) { }

  async getBlocks(userId: string, page: number = 1): Promise<User[]> {

    if (page < 1) page = 1;
    
    const block = await this.blockModel.find({ ownerId: userId }).limit(20).skip((page - 1) * 20).distinct('userId').exec();

    if (block.length == 0) return [];

    return this.userModel.find({ _id: { $in: block } }).select(baseUserFields).exec();
  }

  async addBlock(targetUserId: string, userId: string) {

    if (targetUserId == userId) throw new BadRequestException('you can not block yourself');

    const isBlocked = await this.blockModel.findOne({ ownerId: userId, userId: targetUserId }).exec();

    if (isBlocked) throw new BadRequestException('the user is already in block list');

    this.friendModel.deleteMany({ $or: [{ ownerId: userId, userId: targetUserId }, { ownerId: targetUserId, userId }] }).exec();
    
    await this.blockModel.updateOne({ ownerId: userId, userId: targetUserId }, { ownerId: userId, userId: targetUserId }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();

    return 'user added to block list';
  }

  async deleteBlock(targetUserId: string, userId: string) {

    if (targetUserId == userId) throw new BadRequestException('you can not remove yourself');

    const existBlock = await this.blockModel.findOneAndDelete({ ownerId: userId, userId: targetUserId }).exec();

    if (!existBlock) throw new BadRequestException('the user is not exist in block list');

    return 'user deleted from block list';
  }
}
