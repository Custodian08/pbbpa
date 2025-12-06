import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest() as any;
    const token = request.cookies?.access_token || (request.headers?.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : undefined);
    if (!token) return false;
    try {
      const payload = await this.jwt.verifyAsync(token);
      request.user = payload; // { sub, roles }
      return true;
    } catch {
      return false;
    }
  }
}
