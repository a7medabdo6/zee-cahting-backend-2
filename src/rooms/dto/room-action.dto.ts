import { IsMongoId } from "class-validator";

export class RoomActionDto {

    @IsMongoId()
    roomId: string;

    @IsMongoId()
    userId: string;
}