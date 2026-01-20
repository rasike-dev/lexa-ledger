import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logApiError } from './error-logger';

/**
 * Global Exception Filter
 * 
 * Catches all exceptions and provides consistent error response format.
 * Filters stack traces in production for security.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract context from request
    const correlationId = request.headers['x-correlation-id'] as string | undefined;
    const requestId = request.headers['x-request-id'] as string | undefined;
    const userId = (request as any).user?.sub || (request as any).user?.id;
    const tenantId = (request as any).tenantId;

    // Determine status code and message
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Format error message
    const errorMessage =
      typeof message === 'string'
        ? message
        : (message as any)?.message || 'Internal server error';

    // Log error with context
    logApiError(exception, {
      component: 'API',
      event: 'http_exception',
      correlationId,
      requestId,
      userId,
      tenantId,
      endpoint: request.url,
      method: request.method,
      statusCode: status,
    });

    // Build error response
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
    };

    // Include correlation ID if available
    if (correlationId) {
      errorResponse.correlationId = correlationId;
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Send response
    response.status(status).json(errorResponse);
  }
}
