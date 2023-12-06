import { IsString, IsEnum, IsOptional } from "class-validator";
import { ReactionsTypes } from "src/common/enums";

export class ReactionDto {

    @IsString()
    @IsOptional()
    roomId: string;

    @IsString()
    messageId: string;

    @IsOptional()
    @IsEnum(ReactionsTypes)
    type?: number;
}