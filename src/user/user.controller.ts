import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserAuth } from 'src/common/user_auth';
import { UserJwt } from 'src/common/user_decorate';
import { UserGuard } from 'src/common/user_guard';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ParseObjectIdPipe } from 'src/common/parse_object_id_pipe';
import { ChatGateway } from 'src/chat/chat-gateway';

@Controller('user')
@UseGuards(UserGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly chatGateway: ChatGateway,
  ) { }

  @Get('')
  getUser(@UserJwt() userAuth: UserAuth) {
    return this.userService.getUserData(userAuth.id);
  }

  @Get(':id')
  getUserById(@UserJwt() userAuth: UserAuth, @Param('id', ParseObjectIdPipe) targetUserId: string) {
    return this.userService.getUserById(targetUserId, userAuth.id);
  }

  @Patch('')
  async updateUser(@UserJwt() userAuth: UserAuth, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userService.updateUser(userAuth.id, updateUserDto);
    if (updateUserDto.isHiddenActivity != null) {
      this.chatGateway.sendUserOnlineStatusToContacts(userAuth.id, true);
    }
    return user;
  }

  @Patch('update-password')
  updatePassword(@UserJwt() userAuth: UserAuth, @Body() updatePasswordDto: UpdatePasswordDto) {
    return this.userService.updatePassword(userAuth.id, updatePasswordDto);
  }

  @Post('search')
  search(@UserJwt() userAuth: UserAuth, @Body('query') query) {
    return this.userService.search(query, userAuth.id);
  }
}
