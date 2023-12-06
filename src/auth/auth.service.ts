import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/entities/user.entity';
import { Model } from 'mongoose';
import { decryptText, encryptText } from 'src/common/crypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>) { }

  async register(registerDto: RegisterDto): Promise<any> {

    const user = await this.userModel.findOne({ username: registerDto.username }).select('_id').exec();

    if (user) throw new BadRequestException('Username already exists');

    if (registerDto.deviceId) {
      const count = await this.userModel.find({ deviceId: registerDto.deviceId }).count().exec();
      if (count >= 5) throw new BadRequestException('Max Account 5 per Mobile');
    }
    const encryptPassword = encryptText(registerDto.password);

    const newUser = await (new this.userModel(registerDto.deviceId ? { username: registerDto.username, password: encryptPassword, fcm: registerDto.fcm, deviceId: registerDto.deviceId } : { username: registerDto.username, password: encryptPassword, fcm: registerDto.fcm })).save();

    return await this.generateJwtToken(newUser);
  }

  async login(loginDto: LoginDto): Promise<any> {

    const user = await this.userModel.findOne({ username: loginDto.username }).exec();

    if (!user) throw new NotFoundException('username is not exist');

    const decryptedPassword = decryptText(user.password);

    if (decryptedPassword != loginDto.password) throw new BadRequestException('invalid credentials');

    if (loginDto.fcm) {
      this.userModel.updateOne({ _id: user.id }, { $addToSet: { fcm: loginDto.fcm } }).exec();
    }
    return await this.generateJwtToken(user);
  }

  private async generateJwtToken(user: any): Promise<Object> {

    return {
      'accessToken': await this.jwtService.signAsync({
        id: user.id,
      }),
    };
  }
}
