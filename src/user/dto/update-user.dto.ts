import { IsBoolean, IsDate, IsDateString, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsPositive, IsString, Length, MaxLength } from "class-validator";
import { Gender } from "src/common/enums";

export class UpdateUserDto {

    @IsEmail()
    @IsOptional()
    readonly email?: string;

    @IsString()
    @IsOptional()
    readonly country?: string;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    readonly age?: number;

    @IsEnum(Gender)
    @IsOptional()
    readonly gender?: Gender;

    @IsString()
    @IsOptional()
    readonly picture?: string;

    @IsString()
    @IsOptional()
    readonly status?: string;

    @IsDateString()
    @IsOptional()
    readonly birthday?: Date;

    @IsBoolean()
    @IsOptional()
    readonly isPrivateLock?: boolean;

    @IsBoolean()
    @IsOptional()
    readonly isHiddenActivity?: boolean;

    @IsNumber()
    @IsOptional()
    readonly color?: number;
}