import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();

    // -----------------------------
    // Normal NestJS HTTP exceptions
    // -----------------------------
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string | string[];

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        message = (exceptionResponse as {
          message: string | string[];
        }).message;
      } else {
        message = exception.message;
      }

      response.status(status).json({
        message,
        error: HttpStatus[status] ?? 'Error',
        statusCode: status,
        path: request.url,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // -----------------------------
    // PostgreSQL / TypeORM errors
    // -----------------------------
    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as {
        code?: string;
        detail?: string;
        constraint?: string;
      };

      // PostgreSQL duplicate key
      if (driverError.code === '23505') {
        const detail = driverError.detail ?? '';

        let message = 'A record with this value already exists';

        if (detail.includes('"email"')) {
          message = 'A user with this email already exists';
        } else if (detail.includes('"plateNumber"')) {
          message =
            'A vehicle with this plate number already exists';
        } else if (detail.includes('"partNumber"')) {
          message =
            'A part with this part number already exists';
        }

        response.status(HttpStatus.CONFLICT).json({
          message,
          error: 'Conflict',
          statusCode: HttpStatus.CONFLICT,
          path: request.url,
          timestamp: new Date().toISOString(),
        });

        return;
      }

      // -----------------------------
      // Other database errors
      // -----------------------------
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'A database error occurred',
        error: 'Internal Server Error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: request.url,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // -----------------------------
    // Unknown/unhandled exceptions
    // -----------------------------
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
      error: 'Internal Server Error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}