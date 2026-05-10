/**
 * Cron job registry — starts all background scheduled tasks.
 *
 * Called once from index.ts after the HTTP server starts.
 * Each job is its own module with a single exported async function.
 *
 * SOLID notes:
 *   - Open/closed: add new cron jobs by importing and scheduling here.
 *   - Single responsibility: this file only registers schedules.
 */

import cron from 'node-cron';
import { logger } from '../logger.js';
import { runAbandonmentRecovery } from './abandonment-recovery.js';
import { runFollowUpSequence } from './follow-up-sequence.js';

export function startCronJobs(): void {
  // Abandonment recovery — every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    logger.debug('cron: running abandonment recovery');
    void runAbandonmentRecovery();
  });

  // Post-booking follow-up sequence — every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    logger.debug('cron: running follow-up sequence');
    void runFollowUpSequence();
  });

  logger.info('cron jobs started: abandonment-recovery (*/15min), follow-up-sequence (*/15min)');
}
