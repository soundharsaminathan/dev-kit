import type { INestApplication } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { ServerOptions } from "socket.io";

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplication,
    private readonly redisUrl: string | null,
  ) {
    super(app);
  }

  async connectToRedis() {
    if (!this.redisUrl) {
      this.logger.warn(
        "REDIS_URL not set — Socket.IO uses in-memory adapter (single instance only)",
      );
      return;
    }

    const pubClient = createClient({
      url: this.redisUrl,
      socket: { connectTimeout: 8_000 },
    });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (error) => {
      this.logger.warn(`Socket Redis pub error: ${error.message}`);
    });
    subClient.on("error", (error) => {
      this.logger.warn(`Socket Redis sub error: ${error.message}`);
    });

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log("Socket.IO Redis adapter connected");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Socket.IO Redis adapter unavailable (${message}) — using in-memory adapter`,
      );
      await Promise.allSettled([pubClient.quit(), subClient.quit()]);
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
