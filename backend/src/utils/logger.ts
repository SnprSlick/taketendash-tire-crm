import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logFormat = winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
  const logObject = {
    timestamp,
    level,
    message,
    context,
    ...(trace && { trace }),
    ...meta,
  };

  return process.env.LOG_FORMAT === 'json'
    ? JSON.stringify(logObject)
    : `${timestamp} [${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}${trace ? `\n${trace}` : ''}`;
});

const createLogger = () => {
  const transports: winston.transport[] = [];

  // Console transport
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
      ),
    }),
  );

  // File transport for production
  if (process.env.NODE_ENV === 'production') {
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/tire-crm-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
      }),
    );

    // Error log file
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/tire-crm-error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
      }),
    );
  }

  return winston.createLogger({
    transports,
    exceptionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat,
        ),
      }),
    ],
  });
};

export const logger = createLogger();

// NestJS Logger Service
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class WinstonLogger implements LoggerService {
  log(message: any, context?: string) {
    logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    logger.error(message, { context, trace });
  }

  warn(message: any, context?: string) {
    logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    logger.verbose(message, { context });
  }
}