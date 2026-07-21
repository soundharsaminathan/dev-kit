import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuthModule } from "./auth/auth.module";
import { BatchesModule } from "./batches/batches.module";
import { BillingModule } from "./billing/billing.module";
import { BookingsModule } from "./bookings/bookings.module";
import { BranchesModule } from "./branches/branches.module";
import { CalendarModule } from "./calendar/calendar.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { ChatModule } from "./chat/chat.module";
import { ContestsModule } from "./contests/contests.module";
import { HealthModule } from "./health/health.module";
import { HomeModule } from "./home/home.module";
import { JobsModule } from "./jobs/jobs.module";
import { MediaModule } from "./media/media.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PlansModule } from "./plans/plans.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RetentionModule } from "./retention/retention.module";
import { SessionsModule } from "./sessions/sessions.module";
import { SocialModule } from "./social/social.module";
import { StudiosModule } from "./studios/studios.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { UserCryptoModule } from "./users/user-crypto.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserCryptoModule,
    AuthModule,
    UsersModule,
    StudiosModule,
    BranchesModule,
    BatchesModule,
    CertificatesModule,
    ContestsModule,
    PlansModule,
    SubscriptionsModule,
    SessionsModule,
    AttendanceModule,
    BookingsModule,
    CalendarModule,
    BillingModule,
    NotificationsModule,
    RetentionModule,
    MediaModule,
    SocialModule,
    ChatModule,
    JobsModule,
    HealthModule,
    HomeModule,
  ],
})
export class AppModule {}
