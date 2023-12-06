import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class LoginDto {

    @IsNotEmpty()
    @MaxLength(64)
    readonly username: string;

    @IsNotEmpty()
    @Length(6, 24)
    readonly password: string;

    @IsString()
    @IsOptional()
    fcm?: string;
}
