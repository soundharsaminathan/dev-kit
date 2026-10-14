import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { FirebaseService } from "./firebase.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: unknown;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();
    const auth = await this.firebase.verifyToken(token);
    request.user = await this.firebase.resolveUser(auth);
    return true;
  }
}
