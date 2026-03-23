import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsGatewayService } from './payments.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsGatewayService],
})
export class PaymentsModule {}
