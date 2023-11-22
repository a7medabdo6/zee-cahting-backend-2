import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { decryptText, encryptText } from 'src/common/crypt';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { User } from './entities/user.entity';
import { baseUserFields, fullUserFields, userDataExcludedFields } from 'src/common/user_common';
import { Friend } from 'src/friends/entities/friend';

@Injectable()
export class UserService {

  constructor(@InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Friend.name) private friendModel: Model<Friend>,
  ) { }

  async getUserData(id: string): Promise<User> {
    const [user] = await Promise.all([
      this.userModel.findOne({ _id: id }).select(userDataExcludedFields).exec(),
    ]);

    if (!user) throw new UnauthorizedException('the user is not exist');
    if (user.isBlock == true) throw new UnauthorizedException('the user is blocked');

    return user;
  }

  async getUserById(targetUserId: string, userId: string): Promise<User> {

    if (targetUserId == null) throw new BadRequestException('invalid User ID');

    const [targetUser, friend, friendsCount] = await Promise.all([
      this.userModel.findOneAndUpdate({ _id: targetUserId, block: { $nin: [userId] } }, { $inc: { views: 1 } }, { returnOriginal: false }).select(fullUserFields).exec(),
      this.friendModel.findOne({ ownerId: userId, userId: targetUserId }).select('isAccepted').exec(),
      this.friendModel.countDocuments({ ownerId: targetUserId, isAccepted: true }).exec(),
    ]);

    if (!targetUser) throw new NotFoundException('the user is not exist');
    targetUser.isFriend = friend != null && friend.isAccepted;
    targetUser.isOnline = !targetUser.isHiddenActivity || targetUser.isHiddenActivity && targetUser.isFriend ? targetUser.isOnline : null;
    targetUser.isFriendRequestSent = friend != null && !friend.isAccepted;
    targetUser.friendsCount = friendsCount;

    return targetUser;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {

    const user = await this.userModel.findOneAndUpdate({ _id: id }, updateUserDto, { returnOriginal: false }).select(userDataExcludedFields).exec();
    if (!user) throw new UnauthorizedException('the user is not exist');

    return user;
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto): Promise<User> {

    const user = await this.userModel.findById(id).exec();

    if (!user) throw new UnauthorizedException('the user is not exist');

    const decryptedPassword = decryptText(user.password);

    if (decryptedPassword != updatePasswordDto.oldPassword) throw new BadRequestException('invalid old Password');

    return this.userModel.findOneAndUpdate({ _id: id }, { password: encryptText(updatePasswordDto.newPassword) }, { returnOriginal: false }).select(userDataExcludedFields).exec();
  }

  async getUserDataForSocket(id: string): Promise<User | undefined> {
    const user = await this.userModel.findOne({ _id: id }).select(userDataExcludedFields).exec();

    if (!user) return undefined;

    return user;
  }

  async search(query: string, userId: string): Promise<User[]> {
    const [result, friends] = await Promise.all([this.userModel.find({ username: { $regex: query, $options: 'i' }, _id: { $ne: userId } }).select(`${baseUserFields} isOnline`).limit(50).exec(), this.friendModel.find({ ownerId: userId, isAccepted: true }).distinct('userId').exec()]);

    for (const user of result) {
      user.isOnline = !friends.includes(user.id) ? null : user.isOnline;
    }
    return result;
  }
}