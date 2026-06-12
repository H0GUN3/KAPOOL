import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { hashLocalDemoPassword, verifyLocalDemoPassword } from './password';
import { TokenService } from './token.service';

type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;
type SignupRole = 'passenger' | 'driver';

export interface AuthProfileUpdateBody {
  name?: string;
  nickname?: string;
  schoolEmail?: string;
  department?: string;
  phone?: string;
  homeRegion?: string;
  photoDataUrl?: string;
}

export interface SignupRequestBody {
  email?: string;
  password?: string;
  role?: string;
  name?: string;
  nickname?: string;
  schoolEmail?: string;
  department?: string;
  homeRegion?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  isAdmin: boolean;
  profile: {
    name: string;
    nickname: string;
    schoolEmail: string;
    department: string;
    homeRegion?: string;
    photoDataUrl?: string;
  };
}

export interface AuthSessionDto {
  accessToken: string;
  tokenType: 'Bearer';
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  async login(email: string, password: string): Promise<AuthSessionDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(normalizedEmail);

    if (!user || user.isSuspended || !verifyLocalDemoPassword(password, user.passwordHash)) {
      throw new UnauthorizedException({ error: 'invalid_credentials' });
    }

    const authUser = this.toAuthUser(user);
    const accessToken = this.tokenService.issueToken({
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
      isAdmin: authUser.isAdmin,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: authUser,
    };
  }

  async signup(body: SignupRequestBody): Promise<AuthSessionDto> {
    const data = this.parseSignup(body);

    try {
      const user = await this.prismaService.user.create({
        data: {
          email: data.email,
          passwordHash: hashLocalDemoPassword(data.password),
          role: data.role,
          isAdmin: false,
          profile: {
            create: {
              name: data.name,
              nickname: data.nickname,
              schoolEmail: data.schoolEmail,
              department: data.department,
              homeRegion: data.homeRegion,
            },
          },
        },
        include: { profile: true },
      });

      return this.createSession(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({ error: 'account_already_exists' });
      }

      throw error;
    }
  }

  async getUserById(id: string): Promise<AuthUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user || user.isSuspended) {
      throw new UnauthorizedException({ error: 'invalid_session' });
    }

    return this.toAuthUser(user);
  }

  async updateProfile(id: string, body: AuthProfileUpdateBody): Promise<AuthUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user || user.isSuspended) {
      throw new UnauthorizedException({ error: 'invalid_session' });
    }

    if (!user.profile) {
      throw new UnauthorizedException({ error: 'missing_profile' });
    }

    const data = this.parseProfileUpdate(body);

    try {
      const updatedProfile = await this.prismaService.profile.update({
        where: { userId: id },
        data,
        include: { user: true },
      });

      return this.toAuthUser({ ...updatedProfile.user, profile: updatedProfile });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({ error: 'school_email_already_exists' });
      }

      throw error;
    }
  }

  private async findUserByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  private parseProfileUpdate(body: AuthProfileUpdateBody): Prisma.ProfileUpdateInput {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException({ error: 'invalid_profile_payload' });
    }

    const data: Prisma.ProfileUpdateInput = {};
    const requiredFields = ['name', 'nickname', 'schoolEmail', 'department'] as const;
    const optionalFields = ['phone', 'homeRegion'] as const;

    for (const field of requiredFields) {
      if (body[field] === undefined) {
        continue;
      }

      if (typeof body[field] !== 'string' || !body[field].trim()) {
        throw new BadRequestException({ error: `invalid_${field}` });
      }

      data[field] = body[field].trim();
    }

    for (const field of optionalFields) {
      if (body[field] === undefined) {
        continue;
      }

      if (typeof body[field] !== 'string') {
        throw new BadRequestException({ error: `invalid_${field}` });
      }

      data[field] = body[field].trim() || null;
    }

    if (body.photoDataUrl !== undefined) {
      data.photoDataUrl = this.parsePhotoDataUrl(body.photoDataUrl) || null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({ error: 'invalid_profile_payload' });
    }

    return data;
  }

  private parsePhotoDataUrl(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException({ error: 'invalid_photoDataUrl' });
    }

    const photoDataUrl = value.trim();

    if (!photoDataUrl) {
      return undefined;
    }

    if (photoDataUrl.length > 750_000 || !/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(photoDataUrl)) {
      throw new BadRequestException({ error: 'invalid_photoDataUrl' });
    }

    return photoDataUrl;
  }

  private parseSignup(body: SignupRequestBody) {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException({ error: 'invalid_signup_payload' });
    }

    const requiredFields = ['email', 'password', 'name', 'nickname', 'schoolEmail', 'department'] as const;
    const data = {} as Record<(typeof requiredFields)[number], string> & { role: SignupRole; homeRegion?: string };

    for (const field of requiredFields) {
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        throw new BadRequestException({ error: `invalid_${field}` });
      }

      data[field] = body[field].trim();
    }

    if (body.role !== 'passenger' && body.role !== 'driver') {
      throw new BadRequestException({ error: 'invalid_role' });
    }

    data.email = data.email.toLowerCase();
    data.schoolEmail = data.schoolEmail.toLowerCase();
    data.role = body.role;

    if (body.homeRegion !== undefined) {
      if (typeof body.homeRegion !== 'string') {
        throw new BadRequestException({ error: 'invalid_homeRegion' });
      }

      data.homeRegion = body.homeRegion.trim() || undefined;
    }

    return data;
  }

  private createSession(user: UserWithProfile): AuthSessionDto {
    const authUser = this.toAuthUser(user);
    const accessToken = this.tokenService.issueToken({
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
      isAdmin: authUser.isAdmin,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: authUser,
    };
  }

  private toAuthUser(user: UserWithProfile): AuthUser {
    if (!user.profile) {
      throw new UnauthorizedException({ error: 'missing_profile' });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      profile: {
        name: user.profile.name,
        nickname: user.profile.nickname,
        schoolEmail: user.profile.schoolEmail,
        department: user.profile.department,
        homeRegion: user.profile.homeRegion ?? undefined,
        photoDataUrl: user.profile.photoDataUrl ?? undefined,
      },
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
