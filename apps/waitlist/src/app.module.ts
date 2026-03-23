import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntry } from './waitlist/waitlist.entity';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb',
        host: config.get('DB_HOST', 'mariadb'),
        port: Number(config.get('DB_PORT', 3306)),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', 'password'),
        database: config.get('DB_NAME', 'user'),
        entities: [WaitlistEntry],
        synchronize: true,
      }),
    }),
    WaitlistModule,
  ],
})
export class AppModule {}
