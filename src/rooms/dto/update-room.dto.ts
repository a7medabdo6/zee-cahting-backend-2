import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateRoomDto {

    @IsNotEmpty()
    @IsMongoId()
    roomId: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    picture?: string;

    @IsOptional()
    @IsBoolean()
    membersOnly?: boolean;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsString()
    messageOwner?: string;
}
