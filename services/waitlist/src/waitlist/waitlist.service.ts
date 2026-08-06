import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { normalizeWaitlistJoin } from '@misneach/public-flows';
import { Repository } from 'typeorm';
import { JoinWaitlistDto } from './waitlist.dto';
import { WaitlistEntry } from './waitlist.entity';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly repo: Repository<WaitlistEntry>,
  ) {}

  async join(dto: JoinWaitlistDto) {
    const payload = normalizeWaitlistJoin(dto);

    const existing = await this.repo.findOne({
      where: { email: payload.email, interest: payload.interest },
    });

    if (existing) {
      return {
        ok: true,
        alreadyJoined: true,
        id: existing.id,
      };
    }

    const entry = this.repo.create({
      email: payload.email,
      interest: payload.interest,
      name: payload.name || null,
      source: payload.source || null,
    });

    const saved = await this.repo.save(entry);

    return {
      ok: true,
      alreadyJoined: false,
      id: saved.id,
    };
  }
}
