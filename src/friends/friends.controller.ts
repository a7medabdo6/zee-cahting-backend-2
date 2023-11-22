import { Controller, Get, Post, Delete, UseGuards, Body, Query } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { ParseObjectIdPipe } from 'src/common/parse_object_id_pipe';
import { UserAuth } from 'src/common/user_auth';
import { UserJwt } from 'src/common/user_decorate';
import { UserGuard } from 'src/common/user_guard';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) { }

  @Get('active')
  @UseGuards(UserGuard)
  getActiveFriends(@UserJwt() userAuth: UserAuth, @Query('page') page: number) {
    return this.friendsService.getFriends(userAuth.id, page);
  }

  @Get('requests')
  @UseGuards(UserGuard)
  getPendingFriends(@UserJwt() userAuth: UserAuth, @Query('page') page: number) {
    return this.friendsService.getFriendRequests(userAuth.id, page);
  }

  @Post('request')
  @UseGuards(UserGuard)
  addFriend(@UserJwt() userAuth: UserAuth, @Body('userId', ParseObjectIdPipe) targetUserId: string) {
    return this.friendsService.sendFriendRequest(targetUserId, userAuth.id);
  }

  @Post('search')
  @UseGuards(UserGuard)
  searchFriends(@UserJwt() userAuth: UserAuth, @Body('query') query: string) {
    return this.friendsService.searchFriends(userAuth.id, query);
  }

  @Delete('request')
  @UseGuards(UserGuard)
  cancelFriendRequest(@UserJwt() userAuth: UserAuth, @Body('userId', ParseObjectIdPipe) targetUserId: string) {
    return this.friendsService.cancelFriendRequest(targetUserId, userAuth.id);
  }

  @Post('accept')
  @UseGuards(UserGuard)
  acceptFriend(@UserJwt() userAuth: UserAuth, @Body('userId', ParseObjectIdPipe) targetUserId: string) {
    return this.friendsService.acceptFriendRequest(targetUserId, userAuth.id);
  }

  @Delete()
  @UseGuards(UserGuard)
  deleteFriend(@UserJwt() userAuth: UserAuth, @Body('userId', ParseObjectIdPipe) targetUserId: string) {
    return this.friendsService.deleteFriend(targetUserId, userAuth.id);
  }
}
