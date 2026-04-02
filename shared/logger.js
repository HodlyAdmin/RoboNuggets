/**
 * Colorful console logger for RoboNuggets agent output
 *
 * Log levels (set via LOG_LEVEL env var):
 *   debug  — all messages including verbose debug
 *   info   — default (info, success, warn, error, step, header)
 *   warn   — only warnings and errors
 *   error  — only errors
 *   silent — suppresses all output
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 99 };
const currentLevel = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function shouldLog(level) {
  return LEVELS[level] >= currentLevel;
}

export const log = {
  info:    (msg) => shouldLog('info')  && console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${msg}`),
  success: (msg) => shouldLog('info')  && console.log(`${colors.green}${colors.bright}[${timestamp()}]${colors.reset} ${msg}`),
  warn:    (msg) => shouldLog('warn')  && console.log(`${colors.yellow}[${timestamp()}]${colors.reset} ⚠️  ${msg}`),
  error:   (msg) => shouldLog('error') && console.error(`${colors.red}${colors.bright}[${timestamp()}]${colors.reset} ❌ ${msg}`),
  debug:   (msg) => shouldLog('debug') && console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${colors.dim}${msg}${colors.reset}`),
  step:    (num, msg) => shouldLog('info') && console.log(`${colors.magenta}${colors.bright}[${timestamp()}] Step ${num}${colors.reset} → ${msg}`),
  header:  (msg) => {
    if (!shouldLog('info')) return;
    const line = '═'.repeat(60);
    console.log(`\n${colors.cyan}${colors.bright}${line}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}  ${msg}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}${line}${colors.reset}\n`);
  },
};

export default log;
