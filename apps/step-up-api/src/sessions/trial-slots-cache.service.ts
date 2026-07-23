import { Inject, Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

export function trialSlotsKey(studioId: string) {
  return `trial-slots:${studioId}`;
}

const TRIAL_SLOTS_TTL_SECONDS = 300;

@Injectable()
export class TrialSlotsCacheService {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async get(studioId: string): Promise<string | null> {
    return this.redis.get(trialSlotsKey(studioId));
  }

  async set(studioId: string, value: string) {
    await this.redis.set(
      trialSlotsKey(studioId),
      value,
      TRIAL_SLOTS_TTL_SECONDS,
    );
  }

  async invalidate(studioId: string) {
    await this.redis.del(trialSlotsKey(studioId));
  }
}
