import { ServiceUnavailableException } from "@nestjs/common";

export const AI_KEY_REJECTED_MESSAGE =
  "The studio AI API key was rejected. Ask the owner to update it in Settings → Integrations.";

export function aiUnavailable(
  status: number,
  fallbackMessage: string,
): ServiceUnavailableException {
  if (status === 401 || status === 403) {
    return new ServiceUnavailableException(AI_KEY_REJECTED_MESSAGE);
  }
  return new ServiceUnavailableException(fallbackMessage);
}
