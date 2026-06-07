import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@101digital.io' })
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @ApiProperty({ example: '$Abc1234' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
