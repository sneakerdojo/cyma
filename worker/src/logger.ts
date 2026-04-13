import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
});
