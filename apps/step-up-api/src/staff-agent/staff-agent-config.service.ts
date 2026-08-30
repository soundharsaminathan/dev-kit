import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { AiProvider } from "@prisma/client";
import { toAiProviderApiValue } from "../studios/ai-provider";
import { UserCryptoService } from "../users/user-crypto.service";
import type { StaffAgentProvider } from "./agent.types";

export type StudioAiSettings = {
  aiProvider: AiProvider | null;
  aiApiKey: string | null;
  aiApiKeyIv: string | null;
  aiChatModel: string | null;
} | null;

export type ResolvedStaffAgentConfig = {
  provider: StaffAgentProvider;
  apiKey: string;
  chatModel: string | null;
};

@Injectable()
export class StaffAgentConfigService {
  constructor(
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  resolve(settings?: StudioAiSettings): ResolvedStaffAgentConfig {
    if (!settings?.aiProvider || !settings.aiApiKey || !settings.aiApiKeyIv) {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    }

    const provider = toAiProviderApiValue(settings.aiProvider);
    if (!provider) {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    }

    let apiKey: string;
    try {
      apiKey = this.crypto
        .decryptStudioSecret(settings.aiApiKey, settings.aiApiKeyIv)
        .trim();
    } catch {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    }

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "AI agent is not configured for this studio.",
      );
    }

    return {
      provider,
      apiKey,
      chatModel: settings.aiChatModel?.trim() || null,
    };
  }
}
