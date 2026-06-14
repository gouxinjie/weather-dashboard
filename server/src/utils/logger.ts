/**
 * @file 日志工具
 * @description 统一的日志记录工具
 */

/** 日志级别 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/** 当前日志级别 */
let currentLevel: LogLevel = 'info';

/**
 * 设置日志级别
 * @param level 日志级别
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * 格式化日志消息
 * @param level 日志级别
 * @param message 日志消息
 * @param data 附加数据
 */
function formatLog(level: LogLevel, message: string, data?: unknown): void {
  const levelValue = LOG_LEVELS[level];
  const currentValue = LOG_LEVELS[currentLevel];
  if (levelValue < currentValue) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (data !== undefined) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

/** 日志工具 */
export const logger = {
  debug: (message: string, data?: unknown) => formatLog('debug', message, data),
  info: (message: string, data?: unknown) => formatLog('info', message, data),
  warn: (message: string, data?: unknown) => formatLog('warn', message, data),
  error: (message: string, data?: unknown) => formatLog('error', message, data),
};
