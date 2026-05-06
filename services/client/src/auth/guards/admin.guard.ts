import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../types/request';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.ADMIN_UI_ENABLED === 'false') {
      throw new NotFoundException('Admin API disabled');
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = await this.authService.getUserFromSession(req).catch(() => null);
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
