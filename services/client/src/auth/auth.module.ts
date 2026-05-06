import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsModule } from 'src/settings/settings.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MagicLink } from './entities/MagicLink';
import { User } from './entities/User';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MagicLink]),
    ConfigModule,
    SettingsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard],
  exports: [AuthService, AdminGuard],
})
export class AuthModule { }
