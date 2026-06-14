/**
 * @file 服务配置管理
 * @description 从环境变量加载应用配置
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载 server/.env，兼容 tsx 直接运行和构建后运行
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * 规范化和风天气 API Host，统一去掉协议头和尾部斜杠
 * @param host 原始 Host 配置
 * @returns 规范化后的 Host
 */
function normalizeApiHost(host: string): string {
  return host.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/** 应用配置 */
export const config = {
  /** 和风天气 API Key */
  qweatherApiKey: process.env.QWEATHER_API_KEY || '',
  /** 和风天气控制台分配的专属 API Host */
  qweatherApiHost: normalizeApiHost(process.env.QWEATHER_API_HOST || ''),
  /** 服务端口 */
  port: parseInt(process.env.PORT || '3201', 10),
  /** 默认城市 LocationID */
  defaultLocationId: process.env.DEFAULT_LOCATION_ID || '101020100',
  /** 默认城市名称 */
  defaultCityName: process.env.DEFAULT_CITY_NAME || '上海',
  /** 数据库文件路径 */
  dbPath: process.env.DB_PATH || './data/weather.db',
  /** 日志级别 */
  logLevel: process.env.LOG_LEVEL || 'info',
  /** 快照保留天数 */
  snapshotRetentionDays: parseInt(process.env.SNAPSHOT_RETENTION_DAYS || '90', 10),
};
