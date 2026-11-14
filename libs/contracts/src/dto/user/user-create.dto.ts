import { IsBoolean, IsEmail, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserCreateDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd1', description: 'Min 6 chars, requires uppercase, lowercase, number, and symbol' })
  @IsStrongPassword({
    minSymbols: 1,
    minLength: 6,
    minLowercase: 1,
    minNumbers: 1,
    minUppercase: 1,
  })
  password: string;

  @ApiProperty({ example: true, description: 'Whether to receive email notifications' })
  @IsBoolean()
  notifyByEmail: boolean;
}
