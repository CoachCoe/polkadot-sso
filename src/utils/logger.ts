import winston from 'winston';
import { SecurityConfig } from '../config/security';

export const createLogger = (service: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Sanitize sensitive data
        const sanitizedMeta = { ...meta };
        ['password', 'token', 'secret', 'signature'].forEach(key => {
          if (key in sanitizedMeta) {
            sanitizedMeta[key] = '[REDACTED]';
          }
        });

        return JSON.stringify({
          timestamp,
          service,
          level,
          message,
          ...sanitizedMeta
        });
      })
    ),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
}; 