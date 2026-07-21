import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Inject,
  Injectable,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsService } from "./jobs.service";

@Injectable()
export class JobsSecretGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();

    const secret = this.config.get<string>("JOBS_SECRET");
    const provided = request.headers["x-jobs-secret"];

    if (!secret || provided !== secret) {
      throw new UnauthorizedException("Invalid jobs secret");
    }

    return true;
  }
}

@Controller("jobs")
@UseGuards(JobsSecretGuard)
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Post("daily")
  runDaily() {
    return this.jobsService.runDaily();
  }
}
