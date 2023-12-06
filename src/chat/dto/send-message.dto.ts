import { IsArray, IsOptional, IsString } from "class-validator";

export class SendMessageDto {

    @IsString()
    tempId: string;

    @IsString()
    to: string;

    @IsString()
    @IsOptional()
    text: string;

    @IsArray()
    @IsOptional()
    media: any;

    @IsString()
    @IsOptional()
    replayMessage?: string;
}