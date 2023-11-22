import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BlockService } from './block.service';
import { ParseObjectIdPipe } from 'src/common/parse_object_id_pipe';
import { UserAuth } from 'src/common/user_auth';
import { UserJwt } from 'src/common/user_decorate';
import { UserGuard } from 'src/common/user_guard';

@Controller('block')
@UseGuards(UserGuard)
export class BlockController {
  constructor(private readonly blockService: BlockService) { }

  @Get()
  getBlocks(@UserJwt() userAuth: UserAuth, @Query('page') page: number) {
    return this.blockService.getBlocks(userAuth.id, page);
  }

  @Post()
  async addBlock(@UserJwt() userAuth: UserAuth, @Body('userId', ParseObjectIdPipe) targetUserId: string) {
    return this.blockService.addBlock(String(targetUserId), userAuth.id);
  }

  @Delete()
  deleteBlock(@UserJwt() userAuth: UserAuth, @Body('userId', ParseObjectIdPipe) targetUserId: string) {
    return this.blockService.deleteBlock(String(targetUserId), userAuth.id);
  }
}
