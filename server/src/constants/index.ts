/**
 * @file 服务端常量定义
 * @description 后端全局常量
 */

/** 缓存过期时间（毫秒） */
export const CACHE_TTL = {
  /** 实时天气：10 分钟 */
  WEATHER_NOW: 10 * 60 * 1000,
  /** 24 小时趋势：30 分钟 */
  HOURLY: 30 * 60 * 1000,
  /** 7 天预报：60 分钟 */
  DAILY: 60 * 60 * 1000,
  /** 分钟级降水：10 分钟 */
  MINUTELY: 10 * 60 * 1000,
  /** AQI：15 分钟 */
  AIR_NOW: 15 * 60 * 1000,
  /** AQI 小时趋势：30 分钟 */
  AIR_HOURLY: 30 * 60 * 1000,
  /** 预警：5 分钟 */
  ALERTS: 5 * 60 * 1000,
  /** 生活指数：12 小时 */
  INDICES: 12 * 60 * 60 * 1000,
  /** 周/月统计：1 小时 */
  STATS: 60 * 60 * 1000,
} as const;

/** 默认分页大小 */
export const DEFAULT_PAGE_SIZE = 20;

/** AQI 采样最低完整度阈值（75%） */
export const MIN_SAMPLE_COMPLETENESS = 0.75;
