import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, fullName?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    // По умолчанию саморегистрация создаёт обычного пользователя (USER)
    const user = await this.users.createUser({ email, passwordHash, fullName, roleName: 'USER' });
    return this.users.toSafe(user);
  }

  async validate(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validate(email, password);
    const payload = { sub: user.id, roles: user.roles.map((r: any) => r.role.name) };
    const token = await this.jwt.signAsync(payload);
    return { token, user: this.users.toSafe(user) };
  }
}
