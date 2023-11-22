import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { Block, BlockSchema } from './entities/block';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { Friend, FriendSchema } from 'src/friends/entities/friend';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Block.name, schema: BlockSchema },
      { name: Friend.name, schema: FriendSchema }
    ]),
  ],
  controllers: [BlockController],
  providers: [BlockService],
})
export class BlockModule { }
