import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards routes behind a valid JWT access token. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
