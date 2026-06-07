import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './jwt.strategy';

/** Convenience decorator to pull the authenticated user off the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
