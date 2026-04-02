import { log } from '../../../shared/logger.js';

export async function executeAirtableSink(config, generationOutputs) {
  if (!config?.enabled) {
    log.info('⏭️  Airtable Sink disabled in config.');
    return { status: 'skipped' };
  }

  // Airtable integration is an accepted economic adaptation — the original lesson
  // uses Airtable as a central review hub, but this rebuild doesn't implement the
  // 14-field Content table POST. Enable this only after wiring real Airtable REST calls.
  log.warn('⚠️  [Airtable Sink] Enabled in config but not yet implemented. Skipping.');
  return {
    status: 'skipped',
    reason: 'Airtable sink is not yet implemented. See FIDELITY.md for context.',
    timestamp: new Date().toISOString(),
  };
}
