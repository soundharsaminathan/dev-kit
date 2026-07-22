import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private enabled = false;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) {
      this.logger.warn(
        "REDIS_URL not set — queues and unread cache run in degraded mode",
      );
      return;
    }

    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });

    void this.client
      .connect()
      .then(() => {
        this.enabled = true;
        this.logger.log("Redis connected");
      })
      .catch((error: Error) => {
        this.logger.warn(`Redis connect failed: ${error.message}`);
        this.client = null;
        this.enabled = false;
      });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
      this.enabled = false;
    }
  }

  isEnabled() {
    return this.enabled && this.client !== null;
  }

  getClient() {
    return this.client;
  }

  getRedisUrl() {
    return this.config.get<string>("REDIS_URL") ?? null;
  }

  async get(key: string) {
    if (!this.client || !this.enabled) {
      return null;
    }
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (!this.client || !this.enabled) {
      return;
    }
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
      return;
    }
    await this.client.set(key, value);
  }

  async del(key: string) {
    if (!this.client || !this.enabled) {
      return;
    }
    await this.client.del(key);
  }

  async incr(key: string) {
    if (!this.client || !this.enabled) {
      return null;
    }
    return this.client.incr(key);
  }

  async decr(key: string) {
    if (!this.client || !this.enabled) {
      return null;
    }
    return this.client.decr(key);
  }

  async ping() {
    if (!this.client || !this.enabled) {
      return false;
    }
    const result = await this.client.ping();
    return result === "PONG";
  }
}
