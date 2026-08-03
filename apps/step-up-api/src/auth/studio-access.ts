import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { DecryptedUser } from "../users/user-crypto.service";

export function assertSameStudio(
  user: Pick<DecryptedUser, "role" | "studioId">,
  studioId: string,
  message = "You can only access data for your studio",
) {
  if (user.role === UserRole.SYSTEM_ADMIN) {
    throw new ForbiddenException(
      "System admins cannot access tenant studio data",
    );
  }

  if (!user.studioId || user.studioId !== studioId) {
    throw new ForbiddenException(message);
  }
}

export function requireUserStudioId(
  user: Pick<DecryptedUser, "studioId">,
): string {
  if (!user.studioId) {
    throw new ForbiddenException("Your account is not linked to a studio");
  }
  return user.studioId;
}
