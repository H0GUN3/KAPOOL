import { Body, Controller, Get, Inject, Patch, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthProfileUpdateBody, AuthSessionDto, AuthUser } from './auth.service';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.types';

interface LoginRequestDto {
  email?: string;
  password?: string;
}

interface SignupRequestDto {
  email?: string;
  password?: string;
  role?: string;
  name?: string;
  nickname?: string;
  schoolEmail?: string;
  department?: string;
  homeRegion?: string;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginRequestDto): Promise<AuthSessionDto> {
    return this.authService.login(body.email ?? '', body.password ?? '');
  }

  @Post('signup')
  async signup(@Body() body: SignupRequestDto): Promise<AuthSessionDto> {
    return this.authService.signup(body);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest): Promise<AuthUser> {
    return this.authService.getUserById(request.user?.sub ?? '');
  }

  @UseGuards(AuthGuard)
  @Patch('me/profile')
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<AuthUser> {
    return this.authService.updateProfile(request.user?.sub ?? '', (body ?? {}) as AuthProfileUpdateBody);
  }
}
