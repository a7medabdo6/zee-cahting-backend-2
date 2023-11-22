import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class LoginDto {

    @IsNotEmpty()
    @Length(6, 64)
    readonly username: string;

    @IsNotEmpty()
    @Length(6, 24)
    readonly password: string;

    @IsString()
    @IsOptional()
    fcm?: string;
}
