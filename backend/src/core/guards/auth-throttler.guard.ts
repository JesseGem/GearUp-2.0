import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(
    _context: ExecutionContext,
  ): Promise<boolean> {
    // Bypass throttling in non-production environments so
    // repeated test requests don't hit the rate limit window.
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return super.shouldSkip(_context);
  }

  protected async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    const ip = await super.getTracker(req);

    const email =
      typeof req.body?.email === 'string'
        ? req.body.email
            .trim()
            .normalize('NFC')
            .toLowerCase()
        : '';

    return email ? `${email}|${ip}` : ip;
  }
}