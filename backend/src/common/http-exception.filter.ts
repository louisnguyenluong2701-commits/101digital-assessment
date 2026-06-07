import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter that produces a consistent error response shape for
 * every failure:
 *
 *   { "statusCode": 404, "message": "Invoice not found", "error": "Not Found" }
 *
 * Validation errors (from class-validator) arrive as an array of messages and
 * are preserved as such.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name.replace(/Exception$/, '');
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        error = (b.error as string) ?? exception.name.replace(/Exception$/, '');
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(statusCode).json({ statusCode, message, error });
  }
}
