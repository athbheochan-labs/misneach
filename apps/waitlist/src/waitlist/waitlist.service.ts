import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
    const email = dto.email.trim().toLowerCase();
    const interest = dto.interest;

    const existing = await this.repo.findOne({
      where: { email, interest },
    });

    if (existing) {
      return {
        ok: true,
        alreadyJoined: true,
        id: existing.id,
      };
    }

    const entry = this.repo.create({
      email,
      interest,
      name: dto.name?.trim() || null,
      source: dto.source?.trim() || null,
    });

    const saved = await this.repo.save(entry);

    return {
      ok: true,
      alreadyJoined: false,
      id: saved.id,
    };
  }
}
