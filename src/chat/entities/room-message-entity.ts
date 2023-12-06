import { RoomMessageTypes } from 'src/common/enums';
import { User } from 'src/user/entities/user.entity';

export interface RoomMessage {

    id: string;

    sender: User;

    type: RoomMessageTypes;

    roomId: string;

    text: string;

    media: Array<any>;

    tempId?: string;

    createdAt: Date,

    replayMessage?: Object;
}

