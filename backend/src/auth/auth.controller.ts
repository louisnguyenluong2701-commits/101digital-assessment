import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthUser } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a user and return a JWT access token' })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'uuid',
          email: 'admin@101digital.io',
          fullname: 'Admin',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the current authenticated user profile' })
  @ApiOkResponse({
    description: 'Current user',
    schema: {
      example: {
        id: 'uuid',
        email: 'admin@101digital.io',
        fullname: 'Admin',
      },
    },
  })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
