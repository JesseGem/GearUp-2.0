import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  email!: string;
  password!: string;
}