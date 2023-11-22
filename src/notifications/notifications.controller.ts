import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UserGuard } from 'src/common/user_guard';
import { UserAuth } from 'src/common/user_auth';
import { UserJwt } from 'src/common/user_decorate';
import { ParseObjectIdPipe } from 'src/common/parse_object_id_pipe';

@Controller('notifications')
@UseGuards(UserGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get('')
  getNotifications(@UserJwt() userAuth: UserAuth, @Query('page') page: number) {
    return this.notificationsService.getNotifications(userAuth.id, page);
  }

  @Post('read')
  readNotifications(@UserJwt() userAuth: UserAuth, @Body('id', ParseObjectIdPipe) id: string) {
    this.notificationsService.readNotifications(userAuth.id, id);
  }
}
