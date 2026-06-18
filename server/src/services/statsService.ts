/**
 * @file 统计服务
 * @description 周统计、月统计的聚合计算与数据访问
 */

import {
  getDailyStatsRange,
  getCurrentWeeklyStats,
  getCurrentMonthlyStats,
  upsertDailyStats,
  upsertWeeklyStats,
  upsertMonthlyStats,
} from '../repositories/statsRepository';
import {
  getAirNowHistoryRange,
  getLatestDaily,
  getWeatherNowHistoryRange,
} from '../repositories/weatherRepository';
import { qweatherApi } from '../integrations/qweather/client';
import { cacheGet, cacheSet, cacheKey } from '../utils/cache';
import { CACHE_TTL, MIN_SAMPLE_COMPLETENESS } from '../constants';
import { logger } from '../utils/logger';
import type {
  WeeklyStatsResponse,
  MonthlyStatsResponse,
  DailyStats,
  WeatherTypeRatioItem,
  StatsDetailResponse,
  StatsDetailDailyItem,
  QWeatherHistoricalAirHourlyItem,
  QWeatherHistoricalWeatherDaily,
  QWeatherHistoricalWeatherHourlyItem,
} from '../types';

/** 和风历史接口可回填的最大天数 */
const HISTORY_BACKFILL_DAYS = 10;

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
    const dailyStats = await resolveDailyStatsRange(locationId, weekStart, weekEnd);

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

    const dailyStats = await resolveDailyStatsRange(locationId, monthStart, monthEnd);

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
 * 获取统计详情（近 30 天日序列）
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

  const resolvedDailyStats = await resolveDailyStatsRange(locationId, startDate, endDate);

  const resolvedWeeklyStats =
    weeklyStats.statsStatus === 'no_data'
      ? buildWeeklyResponseFromDailyStats(resolvedDailyStats, now)
      : weeklyStats;
  const resolvedMonthlyStats =
    monthlyStats.statsStatus === 'no_data'
      ? buildMonthlyResponseFromDailyStats(resolvedDailyStats, now)
      : monthlyStats;

  return {
    weeklyStats: resolvedWeeklyStats,
    monthlyStats: resolvedMonthlyStats,
    daily30: resolvedDailyStats.map(formatStatsDetailDailyItem),
  };
}

/**
 * 解析指定日期范围的日统计数据
 * @param locationId 城市 LocationID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 合并后的日统计列表
 */
async function resolveDailyStatsRange(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<DailyStats[]> {
  await ensureRecentHistoricalDailyStats(locationId, startDate, endDate);

  const storedDailyStats = getDailyStatsRange(locationId, startDate, endDate);
  const fallbackDailyStats = buildFallbackDailyStats(locationId, startDate, endDate);

  return mergeDailyStats(storedDailyStats, fallbackDailyStats);
}

/**
 * 回填最近 10 天内缺失或不完整的历史日统计
 * @param locationId 城市 LocationID
 * @param startDate 统计开始日期
 * @param endDate 统计结束日期
 */
async function ensureRecentHistoricalDailyStats(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const historyWindowStart = new Date(today);
  historyWindowStart.setDate(today.getDate() - HISTORY_BACKFILL_DAYS);

  const effectiveStart = startDate > formatDate(historyWindowStart) ? startDate : formatDate(historyWindowStart);
  const effectiveEnd = endDate < formatDate(yesterday) ? endDate : formatDate(yesterday);

  if (effectiveStart > effectiveEnd) {
    return;
  }

  const existingStats = getDailyStatsRange(locationId, effectiveStart, effectiveEnd);
  const existingStatsMap = new Map(existingStats.map((item) => [item.stat_date, item]));
  const targetDates = buildDateRange(effectiveStart, effectiveEnd);

  for (const statDate of targetDates) {
    const existing = existingStatsMap.get(statDate);
    const shouldBackfill =
      !existing ||
      existing.is_partial === 1 ||
      existing.sample_count < 24 ||
      existing.aqi_avg === null ||
      existing.aqi_avg <= 0;

    if (!shouldBackfill) {
      continue;
    }

    try {
      const [weatherHistory, airHistory] = await Promise.all([
        qweatherApi.getHistoricalWeather(locationId, toCompactDate(statDate)),
        qweatherApi.getHistoricalAir(locationId, toCompactDate(statDate)),
      ]);

      upsertDailyStats(buildDailyStatsFromHistorical(locationId, statDate, weatherHistory.weatherDaily, weatherHistory.weatherHourly, airHistory));
    } catch (error) {
      logger.warn('历史统计回填失败，继续使用本地快照兜底', {
        locationId,
        statDate,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
}

/**
 * 将历史接口数据聚合为日统计
 * @param locationId 城市 LocationID
 * @param statDate 统计日期
 * @param weatherDaily 历史天气日级数据
 * @param weatherHourly 历史天气小时数据
 * @param airHourly 历史空气质量小时数据
 * @returns 可落库的日统计数据
 */
function buildDailyStatsFromHistorical(
  locationId: string,
  statDate: string,
  weatherDaily: QWeatherHistoricalWeatherDaily,
  weatherHourly: QWeatherHistoricalWeatherHourlyItem[],
  airHourly: QWeatherHistoricalAirHourlyItem[]
): Omit<DailyStats, 'id' | 'created_at'> {
  const weatherSampleCount = weatherHourly.length;
  const airSampleCount = airHourly.length;
  const pairedSampleCount = Math.min(weatherSampleCount, airSampleCount);
  const hourlyTemps = weatherHourly
    .map((item) => toNumber(item.temp))
    .filter((item) => Number.isFinite(item));
  const avgTemp =
    hourlyTemps.length > 0
      ? hourlyTemps.reduce((sum, current) => sum + current, 0) / hourlyTemps.length
      : (toNumber(weatherDaily.tempMax) + toNumber(weatherDaily.tempMin)) / 2;
  const aqiValues = airHourly
    .map((item) => toNumber(item.aqi))
    .filter((item) => item > 0);

  return {
    location_id: locationId,
    stat_date: statDate,
    max_temp: toNumber(weatherDaily.tempMax),
    min_temp: toNumber(weatherDaily.tempMin),
    avg_temp: avgTemp,
    precipitation: toNumber(weatherDaily.precip),
    weather_type: pickMostFrequentText(weatherHourly.map((item) => item.text)) || '暂无数据',
    aqi_avg:
      aqiValues.length > 0
        ? aqiValues.reduce((sum, current) => sum + current, 0) / aqiValues.length
        : null,
    sample_count: pairedSampleCount,
    expected_count: 24,
    is_partial: weatherSampleCount < 24 || airSampleCount < 24 ? 1 : 0,
  };
}

/**
 * 合并已聚合统计与快照兜底统计
 * @param storedDailyStats 已落库的日统计
 * @param fallbackDailyStats 基于快照的兜底日统计
 * @returns 合并后的日统计列表
 */
function mergeDailyStats(
  storedDailyStats: DailyStats[],
  fallbackDailyStats: DailyStats[]
): DailyStats[] {
  const dailyStatsMap = new Map<string, DailyStats>();

  fallbackDailyStats.forEach((item) => {
    dailyStatsMap.set(item.stat_date, item);
  });

  storedDailyStats.forEach((item) => {
    dailyStatsMap.set(item.stat_date, item);
  });

  return Array.from(dailyStatsMap.values()).sort((previous, current) =>
    previous.stat_date.localeCompare(current.stat_date)
  );
}

/**
 * 构建日期范围列表
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 日期字符串列表
 */
function buildDateRange(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const target = new Date(`${endDate}T00:00:00`);

  while (cursor <= target) {
    result.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

/**
 * 转换为和风历史接口要求的 yyyyMMdd 日期
 * @param statDate 日期字符串
 * @returns 紧凑格式日期
 */
function toCompactDate(statDate: string): string {
  return statDate.replace(/-/g, '');
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

/**
 * 基于快照兜底构建日统计序列
 * @param locationId 城市 LocationID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 日统计列表
 */
function buildFallbackDailyStats(
  locationId: string,
  startDate: string,
  endDate: string
): DailyStats[] {
  const weatherHistory = getWeatherNowHistoryRange(locationId, startDate, endDate);
  const airHistory = getAirNowHistoryRange(locationId, startDate, endDate);
  const latestDaily = getLatestDaily(locationId, 30).filter(
    (item) => item.fxDate >= startDate && item.fxDate <= endDate
  );

  const weatherGroupMap = groupByDate(weatherHistory, (item) => item.obs_time);
  const airGroupMap = groupByDate(airHistory, (item) => item.pub_time);
  const forecastMap = new Map(latestDaily.map((item) => [item.fxDate, item]));
  const dateSet = new Set<string>([
    ...weatherGroupMap.keys(),
    ...airGroupMap.keys(),
    ...forecastMap.keys(),
  ]);
  const sortedDates = Array.from(dateSet).sort((previous, current) =>
    previous.localeCompare(current)
  );

  return sortedDates.map((dateText, index) => {
    const weatherItems = weatherGroupMap.get(dateText) || [];
    const airItems = airGroupMap.get(dateText) || [];
    const forecastItem = forecastMap.get(dateText);
    const weatherSampleCount = weatherItems.length;
    const airSampleCount = airItems.length;
    const pairedSampleCount = Math.min(weatherSampleCount, airSampleCount);
    const expectedCount = weatherSampleCount > 0 || airSampleCount > 0 ? 24 : 0;

    const temperatureValues = weatherItems.map((item) => item.temp);
    const avgTemp =
      temperatureValues.length > 0
        ? temperatureValues.reduce((sum, current) => sum + current, 0) / temperatureValues.length
        : forecastItem
          ? (toNumber(forecastItem.tempMax) + toNumber(forecastItem.tempMin)) / 2
          : 0;
    const maxTemp =
      temperatureValues.length > 0
        ? Math.max(...temperatureValues)
        : forecastItem
          ? toNumber(forecastItem.tempMax)
          : 0;
    const minTemp =
      temperatureValues.length > 0
        ? Math.min(...temperatureValues)
        : forecastItem
          ? toNumber(forecastItem.tempMin)
          : 0;
    const precipitationValues = weatherItems.map((item) => item.precip);
    const precipitation =
      weatherSampleCount > 0
        ? Math.max(...precipitationValues)
        : forecastItem !== undefined
          ? toNumber(forecastItem.precip)
          : 0;
    const weatherType =
      pickMostFrequentText(weatherItems.map((item) => item.text)) ||
      forecastItem?.textDay ||
      '暂无数据';
    const aqiAvg =
      airItems.length > 0
        ? airItems.reduce((sum, current) => sum + current.aqi, 0) / airItems.length
        : null;
    const createdAt =
      weatherItems[weatherItems.length - 1]?.obs_time ||
      airItems[airItems.length - 1]?.pub_time ||
      `${dateText} 00:00:00`;

    return {
      id: -(index + 1),
      location_id: locationId,
      stat_date: dateText,
      max_temp: maxTemp,
      min_temp: minTemp,
      avg_temp: avgTemp,
      precipitation,
      weather_type: weatherType,
      aqi_avg: aqiAvg,
      sample_count: pairedSampleCount,
      expected_count: expectedCount,
      is_partial: expectedCount === 0 || pairedSampleCount < 24 ? 1 : 0,
      created_at: createdAt,
    };
  });
}

/**
 * 从日统计构建周统计响应
 * @param dailyStats 日统计列表
 * @param now 当前日期
 * @returns 周统计响应
 */
function buildWeeklyResponseFromDailyStats(
  dailyStats: DailyStats[],
  now: Date
): WeeklyStatsResponse {
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = formatDate(monday);
  const weekEnd = formatDate(sunday);
  const currentWeekDaily = dailyStats.filter(
    (item) => item.stat_date >= weekStart && item.stat_date <= weekEnd
  );

  if (currentWeekDaily.length === 0) {
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

  return formatAggregatedWeekly(aggregateWeekly(currentWeekDaily, weekStart, weekEnd), weekStart, weekEnd);
}

/**
 * 从日统计构建月统计响应
 * @param dailyStats 日统计列表
 * @param now 当前日期
 * @returns 月统计响应
 */
function buildMonthlyResponseFromDailyStats(
  dailyStats: DailyStats[],
  now: Date
): MonthlyStatsResponse {
  const monthText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${monthText}-01`;
  const monthEnd = formatDate(now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays = now.getDate();
  const currentMonthDaily = dailyStats.filter(
    (item) => item.stat_date >= monthStart && item.stat_date <= monthEnd
  );

  if (currentMonthDaily.length === 0) {
    return {
      month: monthText,
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

  return formatAggregatedMonthly(
    aggregateMonthly(currentMonthDaily, monthText, daysInMonth, elapsedDays),
    monthText,
    daysInMonth
  );
}

// ==================== 格式化函数 ====================

/**
 * 将日统计记录格式化为详情页响应项
 * @param record 日统计记录
 * @returns 详情页日序列项
 */
function formatStatsDetailDailyItem(record: DailyStats): StatsDetailDailyItem {
  return {
    statDate: record.stat_date,
    maxTemp: record.max_temp ?? 0,
    minTemp: record.min_temp ?? 0,
    avgTemp: record.avg_temp ?? 0,
    precipitation: record.precipitation,
    weatherType: record.weather_type,
    aqiAvg: record.aqi_avg,
    sampleCount: record.sample_count,
    expectedCount: record.expected_count,
    isPartial: record.is_partial === 1,
  };
}

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

/**
 * 安全转换数字
 * @param value 原始值
 * @returns 数字结果
 */
function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return 0;
  }

  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

/**
 * 按日期分组
 * @param items 原始列表
 * @param getDateValue 取日期方法
 * @returns 分组 Map
 */
function groupByDate<T>(items: T[], getDateValue: (item: T) => string): Map<string, T[]> {
  const groupedMap = new Map<string, T[]>();

  items.forEach((item) => {
    const dateText = getDateValue(item).slice(0, 10);
    const currentItems = groupedMap.get(dateText) || [];
    currentItems.push(item);
    groupedMap.set(dateText, currentItems);
  });

  return groupedMap;
}

/**
 * 选出出现次数最多的天气文本
 * @param values 文本列表
 * @returns 最常见的文本
 */
function pickMostFrequentText(values: string[]): string {
  const counter = new Map<string, number>();

  values.forEach((item) => {
    if (!item) {
      return;
    }

    counter.set(item, (counter.get(item) || 0) + 1);
  });

  let result = '';
  let maxCount = 0;

  counter.forEach((count, text) => {
    if (count > maxCount) {
      result = text;
      maxCount = count;
    }
  });

  return result;
}
