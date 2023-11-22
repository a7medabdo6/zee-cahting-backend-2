import { IsArray, IsEnum, IsMongoId, IsOptional, IsString } from "class-validator";
import { RoomMessageTypes } from "src/common/enums";

export class SendRoomMessageDto {

    @IsString()
    tempId: string;

    @IsString()
    @IsMongoId()
    roomId: string;

    @IsString()
    @IsOptional()
    text: string;

    @IsArray()
    @IsOptional()
    media: any;

    @IsEnum(RoomMessageTypes)
    type: RoomMessageTypes;
}