import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { FirebaseService, type VerifiedAuth } from "./firebase.service";

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      auth?: VerifiedAuth;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();
    request.auth = await this.firebase.verifyToken(token);
    return true;
  }
}
