/**
 * @file 统计服务
 * @description 周统计、月统计的聚合计算与数据访问
 */

import {
  getDailyStatsRange,
  getCurrentWeeklyStats,
  getCurrentMonthlyStats,
  upsertWeeklyStats,
  upsertMonthlyStats,
} from '../repositories/statsRepository';
import { cacheGet, cacheSet, cacheKey } from '../utils/cache';
import { CACHE_TTL, MIN_SAMPLE_COMPLETENESS } from '../constants';
import { logger } from '../utils/logger';
import type {
  WeeklyStatsResponse,
  MonthlyStatsResponse,
  DailyStats,
  WeatherTypeRatioItem,
  StatsDetailResponse,
} from '../types';

/**
 * 获取当前周统计
 * @param locationId 城市 LocationID
 * @returns 周统计响应数据
 */
export async function getWeeklyStats(locationId: string): Promise<WeeklyStatsResponse> {
  const ck = cacheKey('weekly-stats', locationId);
  const cached = cacheGet<WeeklyStatsResponse>(ck);
  if (cached) return cached;

  try {
    // 计算当前周起止日期
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekStart = formatDate(monday);
    const weekEnd = formatDate(sunday);

    // 从日统计聚合
    const dailyStats = getDailyStatsRange(locationId, weekStart, weekEnd);

    if (dailyStats.length === 0) {
      // 尝试从数据库已有统计获取
      const existing = getCurrentWeeklyStats(locationId);
      if (existing) {
        return formatWeeklyResponse(existing);
      }

      return {
        weekStart,
        weekEnd,
        avgTemp: '--',
        totalPrecipitation: '0',
        rainyDays: 0,
        weatherTypeRatio: [],
        aqiAvg: '--',
        sampleDays: 0,
        expectedDays: 7,
        statsStatus: 'no_data',
      };
    }

    const result = aggregateWeekly(dailyStats, weekStart, weekEnd);

    // 写入周统计表
    try {
      upsertWeeklyStats({
        location_id: locationId,
        week_start: weekStart,
        week_end: weekEnd,
        avg_temp: result.avgTemp ?? null,
        total_precipitation: result.totalPrecipitation,
        rainy_days: result.rainyDays,
        aqi_avg: result.aqiAvg ?? null,
        weather_type_ratio: JSON.stringify(result.weatherTypeRatio),
        sample_days: result.sampleDays,
        expected_days: 7,
        stats_status: result.statsStatus,
      });
    } catch (dbErr) {
      logger.error('周统计写入失败', { locationId, error: String(dbErr) });
    }

    const response = formatAggregatedWeekly(result, weekStart, weekEnd);
    cacheSet(ck, response, CACHE_TTL.STATS);
    return response;
  } catch (err) {
    logger.error('获取周统计失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });
    throw new Error('周统计数据获取失败');
  }
}

/**
 * 获取当前月统计
 * @param locationId 城市 LocationID
 * @returns 月统计响应数据
 */
export async function getMonthlyStats(locationId: string): Promise<MonthlyStatsResponse> {
  const ck = cacheKey('monthly-stats', locationId);
  const cached = cacheGet<MonthlyStatsResponse>(ck);
  if (cached) return cached;

  try {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = `${monthStr}-01`;
    const monthEnd = formatDate(now);

    // 该月总天数
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    // 已过天数（截至今天）
    const elapsedDays = now.getDate();

    const dailyStats = getDailyStatsRange(locationId, monthStart, monthEnd);

    if (dailyStats.length === 0) {
      const existing = getCurrentMonthlyStats(locationId);
      if (existing) {
        return formatMonthlyResponse(existing);
      }

      return {
        month: monthStr,
        avgTemp: '--',
        totalPrecipitation: '0',
        rainyDays: 0,
        weatherTypeRatio: [],
        aqiAvg: '--',
        sampleDays: 0,
        expectedDays: daysInMonth,
        isPartialMonth: elapsedDays < daysInMonth,
        statsMode: 'partial_month',
        statsStatus: 'no_data',
      };
    }

    const result = aggregateMonthly(dailyStats, monthStr, daysInMonth, elapsedDays);

    try {
      upsertMonthlyStats({
        location_id: locationId,
        month: monthStr,
        avg_temp: result.avgTemp ?? null,
        total_precipitation: result.totalPrecipitation,
        rainy_days: result.rainyDays,
        aqi_avg: result.aqiAvg ?? null,
        weather_type_ratio: JSON.stringify(result.weatherTypeRatio),
        sample_days: result.sampleDays,
        expected_days: daysInMonth,
        is_partial_month: result.isPartialMonth ? 1 : 0,
        stats_mode: 'partial_month',
        stats_status: result.statsStatus,
      });
    } catch (dbErr) {
      logger.error('月统计写入失败', { locationId, error: String(dbErr) });
    }

    const response = formatAggregatedMonthly(result, monthStr, daysInMonth);
    cacheSet(ck, response, CACHE_TTL.STATS);
    return response;
  } catch (err) {
    logger.error('获取月统计失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });
    throw new Error('月统计数据获取失败');
  }
}

/**
 * 获取统计详情（30天数据）
 * @param locationId 城市 LocationID
 * @returns 统计详情
 */
export async function getStatsDetail(locationId: string): Promise<StatsDetailResponse> {
  const weeklyStats = await getWeeklyStats(locationId);
  const monthlyStats = await getMonthlyStats(locationId);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  const startDate = formatDate(thirtyDaysAgo);
  const endDate = formatDate(now);

  const daily30 = getDailyStatsRange(locationId, startDate, endDate);

  return { weeklyStats, monthlyStats, daily30 };
}

// ==================== 聚合计算函数 ====================

/** 周聚合中间结果 */
interface WeeklyAggregate {
  avgTemp: number | null;
  totalPrecipitation: number;
  rainyDays: number;
  aqiAvg: number | null;
  weatherTypeRatio: WeatherTypeRatioItem[];
  sampleDays: number;
  statsStatus: string;
}

/**
 * 聚合周统计数据
 * @param dailyStats 日统计列表
 * @param weekStart 周开始日期
 * @param weekEnd 周结束日期
 * @returns 聚合结果
 */
function aggregateWeekly(
  dailyStats: DailyStats[],
  _weekStart: string,
  _weekEnd: string
): WeeklyAggregate {
  let tempSum = 0;
  let tempCount = 0;
  let precipSum = 0;
  let rainyCount = 0;
  let aqiSum = 0;
  let aqiCount = 0;
  const typeMap = new Map<string, number>();

  for (const day of dailyStats) {
    if (day.avg_temp !== null && day.avg_temp !== undefined) {
      tempSum += day.avg_temp;
      tempCount++;
    }
    precipSum += day.precipitation;
    if (day.precipitation > 0.1) rainyCount++;
    if (day.aqi_avg !== null && day.aqi_avg !== undefined) {
      aqiSum += day.aqi_avg;
      aqiCount++;
    }
    if (day.weather_type) {
      typeMap.set(day.weather_type, (typeMap.get(day.weather_type) || 0) + 1);
    }
  }

  const weatherTypeRatio: WeatherTypeRatioItem[] = [];
  const total = typeMap.size > 0 ? Array.from(typeMap.values()).reduce((a, b) => a + b, 0) : 0;
  for (const [type, count] of typeMap.entries()) {
    weatherTypeRatio.push({ type, count, ratio: total > 0 ? count / total : 0 });
  }

  const sampleDays = dailyStats.length;
  const statsStatus =
    sampleDays >= 7 * MIN_SAMPLE_COMPLETENESS ? 'complete' : 'partial';

  return {
    avgTemp: tempCount > 0 ? tempSum / tempCount : null,
    totalPrecipitation: precipSum,
    rainyDays: rainyCount,
    aqiAvg: aqiCount > 0 ? aqiSum / aqiCount : null,
    weatherTypeRatio,
    sampleDays,
    statsStatus,
  };
}

/** 月聚合中间结果 */
interface MonthlyAggregate {
  avgTemp: number | null;
  totalPrecipitation: number;
  rainyDays: number;
  aqiAvg: number | null;
  weatherTypeRatio: WeatherTypeRatioItem[];
  sampleDays: number;
  isPartialMonth: boolean;
  statsStatus: string;
}

/**
 * 聚合月统计数据
 * @param dailyStats 日统计列表
 * @param month 月份
 * @param daysInMonth 该月总天数
 * @param elapsedDays 已过天数
 * @returns 聚合结果
 */
function aggregateMonthly(
  dailyStats: DailyStats[],
  _month: string,
  _daysInMonth: number,
  elapsedDays: number
): MonthlyAggregate {
  let tempSum = 0;
  let tempCount = 0;
  let precipSum = 0;
  let rainyCount = 0;
  let aqiSum = 0;
  let aqiCount = 0;
  const typeMap = new Map<string, number>();

  for (const day of dailyStats) {
    if (day.avg_temp !== null && day.avg_temp !== undefined) {
      tempSum += day.avg_temp;
      tempCount++;
    }
    precipSum += day.precipitation;
    if (day.precipitation > 0.1) rainyCount++;
    if (day.aqi_avg !== null && day.aqi_avg !== undefined) {
      aqiSum += day.aqi_avg;
      aqiCount++;
    }
    if (day.weather_type) {
      typeMap.set(day.weather_type, (typeMap.get(day.weather_type) || 0) + 1);
    }
  }

  const weatherTypeRatio: WeatherTypeRatioItem[] = [];
  const total = typeMap.size > 0 ? Array.from(typeMap.values()).reduce((a, b) => a + b, 0) : 0;
  for (const [type, count] of typeMap.entries()) {
    weatherTypeRatio.push({ type, count, ratio: total > 0 ? count / total : 0 });
  }

  const sampleDays = dailyStats.length;
  const isPartialMonth = sampleDays < _daysInMonth;
  const statsStatus =
    sampleDays >= elapsedDays * MIN_SAMPLE_COMPLETENESS ? 'complete' : 'partial';

  return {
    avgTemp: tempCount > 0 ? tempSum / tempCount : null,
    totalPrecipitation: precipSum,
    rainyDays: rainyCount,
    aqiAvg: aqiCount > 0 ? aqiSum / aqiCount : null,
    weatherTypeRatio,
    sampleDays,
    isPartialMonth,
    statsStatus,
  };
}

// ==================== 格式化函数 ====================

function formatWeeklyResponse(record: {
  week_start: string;
  week_end: string;
  avg_temp: number | null;
  total_precipitation: number;
  rainy_days: number;
  aqi_avg: number | null;
  weather_type_ratio: string;
  sample_days: number;
  expected_days: number;
  stats_status: string;
}): WeeklyStatsResponse {
  let weatherTypeRatio: WeatherTypeRatioItem[] = [];
  try {
    weatherTypeRatio = JSON.parse(record.weather_type_ratio);
  } catch {
    // 解析失败使用空数组
  }

  return {
    weekStart: record.week_start,
    weekEnd: record.week_end,
    avgTemp: record.avg_temp !== null ? record.avg_temp.toFixed(1) : '--',
    totalPrecipitation: record.total_precipitation.toFixed(1),
    rainyDays: record.rainy_days,
    weatherTypeRatio,
    aqiAvg: record.aqi_avg !== null ? record.aqi_avg.toFixed(0) : '--',
    sampleDays: record.sample_days,
    expectedDays: record.expected_days,
    statsStatus: record.stats_status,
  };
}

function formatMonthlyResponse(record: {
  month: string;
  avg_temp: number | null;
  total_precipitation: number;
  rainy_days: number;
  aqi_avg: number | null;
  weather_type_ratio: string;
  sample_days: number;
  expected_days: number;
  is_partial_month: number;
  stats_mode: string;
  stats_status: string;
}): MonthlyStatsResponse {
  let weatherTypeRatio: WeatherTypeRatioItem[] = [];
  try {
    weatherTypeRatio = JSON.parse(record.weather_type_ratio);
  } catch {
    // 解析失败使用空数组
  }

  return {
    month: record.month,
    avgTemp: record.avg_temp !== null ? record.avg_temp.toFixed(1) : '--',
    totalPrecipitation: record.total_precipitation.toFixed(1),
    rainyDays: record.rainy_days,
    weatherTypeRatio,
    aqiAvg: record.aqi_avg !== null ? record.aqi_avg.toFixed(0) : '--',
    sampleDays: record.sample_days,
    expectedDays: record.expected_days,
    isPartialMonth: record.is_partial_month === 1,
    statsMode: record.stats_mode,
    statsStatus: record.stats_status,
  };
}

function formatAggregatedWeekly(
  agg: WeeklyAggregate,
  weekStart: string,
  weekEnd: string
): WeeklyStatsResponse {
  return {
    weekStart,
    weekEnd,
    avgTemp: agg.avgTemp !== null ? agg.avgTemp.toFixed(1) : '--',
    totalPrecipitation: agg.totalPrecipitation.toFixed(1),
    rainyDays: agg.rainyDays,
    weatherTypeRatio: agg.weatherTypeRatio,
    aqiAvg: agg.aqiAvg !== null ? agg.aqiAvg.toFixed(0) : '--',
    sampleDays: agg.sampleDays,
    expectedDays: 7,
    statsStatus: agg.statsStatus,
  };
}

function formatAggregatedMonthly(
  agg: MonthlyAggregate,
  month: string,
  daysInMonth: number
): MonthlyStatsResponse {
  return {
    month,
    avgTemp: agg.avgTemp !== null ? agg.avgTemp.toFixed(1) : '--',
    totalPrecipitation: agg.totalPrecipitation.toFixed(1),
    rainyDays: agg.rainyDays,
    weatherTypeRatio: agg.weatherTypeRatio,
    aqiAvg: agg.aqiAvg !== null ? agg.aqiAvg.toFixed(0) : '--',
    sampleDays: agg.sampleDays,
    expectedDays: daysInMonth,
    isPartialMonth: agg.isPartialMonth,
    statsMode: 'partial_month',
    statsStatus: agg.statsStatus,
  };
}

/**
 * 格式化日期为 yyyy-MM-dd
 * @param date Date 对象
 * @returns 格式化的日期字符串
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
