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
import { DataImportModule } from "./data-import/data-import.module";
import { EventsModule } from "./events/events.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { HealthModule } from "./health/health.module";
import { HomeModule } from "./home/home.module";
import { JobsModule } from "./jobs/jobs.module";
import { JourneyModule } from "./journey/journey.module";
import { MediaModule } from "./media/media.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PayoutsModule } from "./payouts/payouts.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queues/queue.module";
import { RedisModule } from "./redis/redis.module";
import { RetentionModule } from "./retention/retention.module";
import { sentryNestImports, sentryNestProviders } from "./sentry-nest";
import { SessionsModule } from "./sessions/sessions.module";
import { SocialModule } from "./social/social.module";
import { StaffAgentModule } from "./staff-agent/staff-agent.module";
import { StaffInvitesModule } from "./staff-invites/staff-invites.module";
import { StudiosModule } from "./studios/studios.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { UserCryptoModule } from "./users/user-crypto.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ...sentryNestImports(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    QueueModule.forRoot({ role: "api" }),
    EventsModule.forRoot({ role: "api" }),
    UserCryptoModule,
    AuthModule,
    UsersModule,
    StudiosModule,
    StaffInvitesModule,
    BranchesModule,
    BatchesModule,
    CertificatesModule,
    ContestsModule,
    DataImportModule,
    SubscriptionsModule,
    MembershipsModule,
    SessionsModule,
    AttendanceModule,
    BookingsModule,
    CalendarModule,
    BillingModule,
    ExpensesModule,
    PayoutsModule,
    NotificationsModule,
    RetentionModule,
    MediaModule,
    SocialModule,
    ChatModule,
    StaffAgentModule,
    JobsModule,
    HealthModule,
    HomeModule,
    JourneyModule,
  ],
  providers: [...sentryNestProviders()],
})
export class AppModule {}
