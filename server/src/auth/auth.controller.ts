import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}

  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: any) {
    const user = await this.auth.register(dto.email, dto.password, dto.fullName);
    // Автологин после регистрации
    const { token } = await this.auth.login(dto.email, dto.password);
    res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax' });
    return { user };
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax' });
    return { user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie('access_token');
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: any) {
    const token = req.cookies?.access_token;
    if (!token) return { user: null };
    try {
      const payload = await this.jwt.verifyAsync(token);
      const { sub } = payload as { sub: string };
      const roles = Array.isArray((payload as any).roles) ? (payload as any).roles : [];
      return { userId: sub, roles };
    } catch {
      return { user: null };
    }
  }
}
