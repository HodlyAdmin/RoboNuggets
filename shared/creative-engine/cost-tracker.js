import { log } from '../logger.js';

/**
 * API Cost Tracking for Gemini
 * 
 * Pricing table (per 1M tokens):
 * - gemini-2.5-flash: input $0.15, output $0.60
 * - gemini-2.0-flash: input $0.10, output $0.40
 * - gemini-2.5-pro:   input $1.25, output $10.00
 */
const PRICING = {
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro':   { input: 1.25, output: 10.00 }
};

const DEFAULT_PRICING = PRICING['gemini-2.5-flash'];

export function createCostTracker() {
  let stats = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    breakdown: {}
  };

  return {
    /**
     * Record one API call
     * @param {Object} entry 
     * @param {string} entry.model 
     * @param {number} entry.inputTokens 
     * @param {number} entry.outputTokens 
     */
    record({ model, inputTokens, outputTokens }) {
      stats.totalCalls++;
      stats.totalInputTokens += inputTokens;
      stats.totalOutputTokens += outputTokens;

      if (!stats.breakdown[model]) {
        stats.breakdown[model] = {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0
        };
      }

      stats.breakdown[model].calls++;
      stats.breakdown[model].inputTokens += inputTokens;
      stats.breakdown[model].outputTokens += outputTokens;
    },

    /**
     * Return a full summary including estimated cost
     */
    summary() {
      const breakdown = {};
      let totalCost = 0;

      for (const [model, data] of Object.entries(stats.breakdown)) {
        const pricing = PRICING[model] || DEFAULT_PRICING;
        const inputCost = (data.inputTokens / 1_000_000) * pricing.input;
        const outputCost = (data.outputTokens / 1_000_000) * pricing.output;
        const modelCost = inputCost + outputCost;
        
        totalCost += modelCost;
        breakdown[model] = {
          ...data,
          estimatedCostUSD: `$${modelCost.toFixed(4)}`
        };
      }

      return {
        totalCalls: stats.totalCalls,
        totalInputTokens: stats.totalInputTokens,
        totalOutputTokens: stats.totalOutputTokens,
        estimatedCostUSD: `$${totalCost.toFixed(4)}`,
        breakdown
      };
    },

    /**
     * Clear all tracked data
     */
    reset() {
      stats = {
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        breakdown: {}
      };
    },

    /**
     * Return serializable object for manifest inclusion
     */
    toJSON() {
      return this.summary();
    }
  };
}
