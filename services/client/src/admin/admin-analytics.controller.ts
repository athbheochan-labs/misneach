import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { ChallengesService } from 'src/challenges/challenges.service';
import { CoursesGatewayService } from 'src/courses/courses.service';
import { FocusGatewayService } from 'src/focus/focus.service';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AdminAnalyticsController {
  constructor(
    private readonly authService: AuthService,
    private readonly coursesService: CoursesGatewayService,
    private readonly focusService: FocusGatewayService,
    private readonly challengesService: ChallengesService,
  ) {}

  private async adminContext(req: AuthenticatedRequest) {
    const user = await this.authService.getUserFromSession(req);
    return {
      userId: user.id,
      clientId: user.clientId,
      role: user.role,
    } as const;
  }

  @Get('dashboard')
  async dashboard(@Req() req: AuthenticatedRequest) {
    const admin = await this.adminContext(req);
    const sharedHeaders = {
      'x-user-id': String(admin.userId),
      'x-user-role': admin.role,
      'x-admin-user-id': String(admin.userId),
      'x-admin-user-role': admin.role,
    };

    const [courses, focus, challenges] = await Promise.all([
      this.coursesService
        .adminGet('/admin/courses/analytics/engagement', admin)
        .catch((error: unknown) => ({
          learnerCount: 0,
          lessonsTracked: 0,
          lessonCompletion: {
            startedCount: 0,
            completedCount: 0,
            completionRate: 0,
          },
          dropoff: {
            topLessons: [],
          },
          featureUsage: [],
          courseGoalSignals: {
            challengeLessons: {
              startedCount: 0,
              completedCount: 0,
              completionRate: 0,
            },
            realWorldChallenges: {
              startedCount: 0,
              completedCount: 0,
              completionRate: 0,
            },
          },
          unavailable: true,
          error: error instanceof Error ? error.message : 'Courses analytics unavailable',
        })),
      this.focusService
        .adminGet('/admin/analytics/overview', sharedHeaders)
        .catch((error: unknown) => ({
          unavailable: true,
          error: error instanceof Error ? error.message : 'Focus analytics unavailable',
        })),
      this.challengesService
        .adminGet('/challenges/admin/analytics/overview', sharedHeaders)
        .catch((error: unknown) => ({
          unavailable: true,
          error: error instanceof Error ? error.message : 'Challenges analytics unavailable',
        })),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      courses,
      focus,
      challenges,
    };
  }
}
