import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  InviteStatus,
  ProfileVisibility,
  type User,
  UserRole,
} from "@prisma/client";
import { EmailService } from "../email/email.service";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

const INVITE_EXPIRES_DAYS = 7;
const INVITABLE_ROLES: UserRole[] = [UserRole.STAFF, UserRole.TRAINER];

@Injectable()
export class StaffInvitesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  async createInvite(
    studioId: string,
    createdById: string,
    data: { email: string; role: UserRole },
  ) {
    if (!INVITABLE_ROLES.includes(data.role)) {
      throw new BadRequestException("Can only invite STAFF or TRAINER");
    }

    const email = data.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException("Email is required");
    }

    const emailHash = this.crypto.hashEmail(email);
    const existing = await this.prisma.user.findFirst({
      where: { studioId, emailHash },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const pending = await this.prisma.staffInvite.findFirst({
      where: {
        studioId,
        email,
        status: InviteStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ConflictException(
        "A pending invite already exists for this email",
      );
    }

    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { name: true },
    });
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    const invite = await this.prisma.staffInvite.create({
      data: {
        studioId,
        email,
        role: data.role,
        token,
        expiresAt,
        createdById,
      },
    });

    const inviteUrl = `${this.appUrl()}/join?token=${encodeURIComponent(token)}`;
    await this.email.sendStaffInvite({
      to: email,
      studioName: studio.name,
      inviteUrl,
      role: data.role,
    });

    return {
      ...invite,
      inviteUrl,
    };
  }

  listInvites(studioId: string) {
    return this.prisma.staffInvite.findMany({
      where: { studioId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async revokeInvite(id: string, studioId: string) {
    const invite = await this.prisma.staffInvite.findUnique({ where: { id } });
    if (!invite || invite.studioId !== studioId) {
      throw new NotFoundException("Invite not found");
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException("Only pending invites can be revoked");
    }

    return this.prisma.staffInvite.update({
      where: { id },
      data: { status: InviteStatus.REVOKED },
    });
  }

  async acceptInvite(token: string, actor: VerifiedInviteActor) {
    const invite = await this.prisma.staffInvite.findUnique({
      where: { token },
    });
    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException("Invite already used or revoked");
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      await this.prisma.staffInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException("Invite expired");
    }

    const actorEmail = actor.email.trim().toLowerCase();
    if (
      this.crypto.hashEmail(actorEmail) !== this.crypto.hashEmail(invite.email)
    ) {
      throw new BadRequestException(
        "Signed-in email must match the invite email",
      );
    }

    const emailHash = this.crypto.hashEmail(invite.email);
    const conflict = await this.prisma.user.findFirst({
      where: {
        studioId: invite.studioId,
        emailHash,
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException("A user with this email already exists");
    }

    const existingByFirebase = await this.prisma.user.findUnique({
      where: { firebaseUid: actor.firebaseUid },
    });

    let user: User;
    if (existingByFirebase) {
      if (
        existingByFirebase.studioId &&
        existingByFirebase.studioId !== invite.studioId
      ) {
        throw new BadRequestException(
          "Account already belongs to another studio",
        );
      }

      const current = this.crypto.decryptUser(existingByFirebase);
      const sealed = this.crypto.sealPii(
        {
          email: invite.email,
          name: current.name || actor.name || "Team member",
          phone: current.phone,
          bio: current.bio,
          instagramUrl: current.instagramUrl,
        },
        existingByFirebase.encryptedKey,
      );

      user = await this.prisma.user.update({
        where: { id: existingByFirebase.id },
        data: {
          ...sealed,
          role: invite.role,
          studioId: invite.studioId,
          profileVisibility: ProfileVisibility.PRIVATE,
        },
      });
    } else {
      const sealed = this.crypto.sealPii({
        email: invite.email,
        name: actor.name?.trim() || "Team member",
        phone: null,
        bio: null,
        instagramUrl: null,
      });

      user = await this.prisma.user.create({
        data: {
          firebaseUid: actor.firebaseUid,
          ...sealed,
          role: invite.role,
          studioId: invite.studioId,
          styles: [],
          profileVisibility: ProfileVisibility.PRIVATE,
        },
      });
    }

    await this.prisma.staffInvite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    const decrypted = this.crypto.decryptUser(user);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
    };
  }

  private appUrl() {
    return (
      this.config.get<string>("APP_URL")?.trim().replace(/\/$/, "") ||
      "http://localhost:5199"
    );
  }
}

export type VerifiedInviteActor = {
  firebaseUid: string;
  email: string;
  name?: string | null;
};
