import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {

    // @IsEmail()
    // readonly email: string;

    @IsNotEmpty()
    @Length(6, 24)
    readonly password: string;

    @IsNotEmpty()
    @MaxLength(64)
    readonly username: string;

    // @IsString()
    // @IsOptional()
    // readonly country?: string;

    // @IsNumber()
    // @IsPositive()
    // @IsOptional()
    // readonly age?: number;

    // @IsEnum(Gender)
    // readonly gender: Gender;

    // @IsString()
    // @IsOptional()
    // readonly picture?: string;

    @IsString()
    @IsOptional()
    readonly fcm?: string;

    @IsString()
    @IsOptional()
    readonly deviceId?: string;
}
