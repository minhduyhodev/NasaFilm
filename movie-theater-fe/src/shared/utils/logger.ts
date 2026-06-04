/**
 * Logger utility for development and production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = import.meta.env.VITE_ENV === 'development';

const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[34m', // Blue
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
};

const getTimestamp = () => {
  return new Date().toLocaleTimeString();
};

const formatMessage = (level: LogLevel, message: string, data?: any) => {
  const timestamp = getTimestamp();
  const color = colors[level];
  const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset}`;

  if (data) {
    return `${prefix} ${message}`, data;
  }
  return `${prefix} ${message}`;
};

export const logger = {
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message, data), data);
    }
  },

  info: (message: string, data?: any) => {
    console.log(formatMessage('info', message, data), data);
  },

  warn: (message: string, data?: any) => {
    console.warn(formatMessage('warn', message, data), data);
  },

  error: (message: string, error?: Error | any) => {
    console.error(formatMessage('error', message, error), error);
  },
};

export default logger;
