import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser, JwtPayload } from './jwt.strategy';

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, fullname: user.fullname },
    };
  }
}
