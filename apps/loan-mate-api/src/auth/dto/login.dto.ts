import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class BypassLoginDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
