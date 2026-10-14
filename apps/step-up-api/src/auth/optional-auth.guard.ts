import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { FirebaseService } from "./firebase.service";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: unknown;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return true;

    const token = header.slice("Bearer ".length).trim();
    if (!token) return true;

    try {
      const auth = await this.firebase.verifyToken(token);
      request.user = await this.firebase.resolveUser(auth);
    } catch {
      request.user = undefined;
    }
    return true;
  }
}
