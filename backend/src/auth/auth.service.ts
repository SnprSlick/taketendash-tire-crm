import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  scopes: string[];
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    scopes: string[];
    stores: string[]; // Store IDs
    mustChangePassword: boolean;
    employeeId?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    console.log(`[AuthService] Validating user: '${username}'`);
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { stores: true, employee: true }
    });

    if (user) {
      console.log(`[AuthService] User found: ${user.username} (ID: ${user.id})`);
      console.log(`[AuthService] User approved: ${user.isApproved}`);
      console.log(`[AuthService] Stored password hash length: ${user.password.length}`);
      console.log(`[AuthService] Received password length: ${password.length}`);
      
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`[AuthService] Password valid: ${isValid}`);
      
      if (isValid) {
        if (!user.isApproved) {
            console.log('[AuthService] User not approved');
            throw new UnauthorizedException('Account not approved by administrator');
        }
        const { password, ...result } = user;
        return result;
      } else {
        console.log('[AuthService] Password mismatch');
      }
    } else {
        console.log(`[AuthService] User not found: '${username}'`);
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      scopes: user.scopes,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        scopes: user.scopes,
        stores: user.stores.map(s => s.id),
        mustChangePassword: user.mustChangePassword,
        employeeId: user.employeeId,
      },
    };
  }

  async validateJwtPayload(payload: JwtPayload) {
    console.log(`[AuthService] Validating JWT payload for sub: ${payload.sub}`);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { stores: true, employee: true }
    });

    if (!user) {
      console.log('[AuthService] User not found for JWT');
      throw new UnauthorizedException('User not found');
    }

    if (!user.isApproved) {
        console.log('[AuthService] User not approved for JWT');
        throw new UnauthorizedException('Account not approved');
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      scopes: user.scopes,
      stores: user.stores.map(s => s.id),
      employeeId: user.employeeId,
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }
}