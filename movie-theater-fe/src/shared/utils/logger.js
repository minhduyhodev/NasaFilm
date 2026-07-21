const levels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.POSITIVE_INFINITY,
};

const configuredLevel = String(
  import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? 'debug' : 'warn'),
).toLowerCase();
const minimumLevel = levels[configuredLevel] ?? levels.warn;

const shouldLog = (level) => levels[level] >= minimumLevel;

const formatMessage = (level, message) =>
  `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;

const write = (level, message, context) => {
  if (!shouldLog(level)) return;

  const method = level === 'debug' ? 'debug' : level === 'info' ? 'info' : level;
  if (context === undefined) {
    console[method](formatMessage(level, message));
    return;
  }
  console[method](formatMessage(level, message), context);
};

export const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
};

export default logger;
