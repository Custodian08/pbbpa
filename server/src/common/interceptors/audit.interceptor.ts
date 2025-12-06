import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest() as any;
    const method = req?.method as string;
    const path = req?.originalUrl || req?.url || '';
    const userId = req?.user?.sub as string | undefined;

    // Логируем только изменяющие запросы
    const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const entityGuess = path.split('?')[0].split('/').filter(Boolean).at(-1) || '';

    const start = Date.now();
    return next.handle().pipe(
      tap(async (data) => {
        if (!shouldLog) return;
        try {
          await this.prisma.auditLog.create({
            data: {
              userId: userId ?? null,
              action: 'REQUEST',
              method,
              path,
              entity: entityGuess.toUpperCase(),
              entityId: typeof data === 'object' && data && 'id' in data ? String((data as any).id) : null,
              meta: undefined,
            },
          });
        } catch {
          // no-op
        }
      })
    );
  }
}
