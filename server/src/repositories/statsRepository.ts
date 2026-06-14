/**
 * @file 统计数据仓库
 * @description 日/周/月统计数据的数据访问层
 */

import { getDb } from '../db';
import type {
  DailyStats,
  WeeklyStatsRecord,
  MonthlyStatsRecord,
} from '../types';

// ==================== 日统计 ====================

/**
 * 插入或更新日统计
 * @param stats 日统计数据
 */
export function upsertDailyStats(stats: Omit<DailyStats, 'id' | 'created_at'>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO weather_stats_daily
      (location_id, stat_date, max_temp, min_temp, avg_temp, precipitation,
       weather_type, aqi_avg, sample_count, expected_count, is_partial)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, stat_date) DO UPDATE SET
      max_temp = excluded.max_temp,
      min_temp = excluded.min_temp,
      avg_temp = excluded.avg_temp,
      precipitation = excluded.precipitation,
      weather_type = excluded.weather_type,
      aqi_avg = excluded.aqi_avg,
      sample_count = excluded.sample_count,
      expected_count = excluded.expected_count,
      is_partial = excluded.is_partial
  `);
  stmt.run(
    stats.location_id,
    stats.stat_date,
    stats.max_temp,
    stats.min_temp,
    stats.avg_temp,
    stats.precipitation,
    stats.weather_type,
    stats.aqi_avg,
    stats.sample_count,
    stats.expected_count,
    stats.is_partial
  );
}

/**
 * 获取指定日期范围的日统计
 * @param locationId 城市 LocationID
 * @param startDate 开始日期 (yyyy-MM-dd)
 * @param endDate 结束日期 (yyyy-MM-dd)
 * @returns 日统计列表
 */
export function getDailyStatsRange(
  locationId: string,
  startDate: string,
  endDate: string
): DailyStats[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_stats_daily
    WHERE location_id = ? AND stat_date >= ? AND stat_date <= ?
    ORDER BY stat_date ASC
  `);
  return stmt.all(locationId, startDate, endDate) as DailyStats[];
}

// ==================== 周统计 ====================

/**
 * 插入或更新周统计
 * @param stats 周统计数据
 */
export function upsertWeeklyStats(
  stats: Omit<WeeklyStatsRecord, 'id' | 'created_at'>
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO weather_stats_weekly
      (location_id, week_start, week_end, avg_temp, total_precipitation, rainy_days,
       aqi_avg, weather_type_ratio, sample_days, expected_days, stats_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, week_start) DO UPDATE SET
      week_end = excluded.week_end,
      avg_temp = excluded.avg_temp,
      total_precipitation = excluded.total_precipitation,
      rainy_days = excluded.rainy_days,
      aqi_avg = excluded.aqi_avg,
      weather_type_ratio = excluded.weather_type_ratio,
      sample_days = excluded.sample_days,
      expected_days = excluded.expected_days,
      stats_status = excluded.stats_status
  `);
  stmt.run(
    stats.location_id,
    stats.week_start,
    stats.week_end,
    stats.avg_temp,
    stats.total_precipitation,
    stats.rainy_days,
    stats.aqi_avg,
    stats.weather_type_ratio,
    stats.sample_days,
    stats.expected_days,
    stats.stats_status
  );
}

/**
 * 获取当前周统计
 * @param locationId 城市 LocationID
 * @returns 当前周统计或 undefined
 */
export function getCurrentWeeklyStats(locationId: string): WeeklyStatsRecord | undefined {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_stats_weekly
    WHERE location_id = ?
    ORDER BY week_start DESC LIMIT 1
  `);
  return stmt.get(locationId) as WeeklyStatsRecord | undefined;
}

/**
 * 获取最近 N 周统计
 * @param locationId 城市 LocationID
 * @param count 周数
 * @returns 周统计列表
 */
export function getRecentWeeklyStats(locationId: string, count: number = 5): WeeklyStatsRecord[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_stats_weekly
    WHERE location_id = ?
    ORDER BY week_start DESC LIMIT ?
  `);
  return stmt.all(locationId, count) as WeeklyStatsRecord[];
}

// ==================== 月统计 ====================

/**
 * 插入或更新月统计
 * @param stats 月统计数据
 */
export function upsertMonthlyStats(
  stats: Omit<MonthlyStatsRecord, 'id' | 'created_at'>
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO weather_stats_monthly
      (location_id, month, avg_temp, total_precipitation, rainy_days,
       aqi_avg, weather_type_ratio, sample_days, expected_days,
       is_partial_month, stats_mode, stats_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(location_id, month) DO UPDATE SET
      avg_temp = excluded.avg_temp,
      total_precipitation = excluded.total_precipitation,
      rainy_days = excluded.rainy_days,
      aqi_avg = excluded.aqi_avg,
      weather_type_ratio = excluded.weather_type_ratio,
      sample_days = excluded.sample_days,
      expected_days = excluded.expected_days,
      is_partial_month = excluded.is_partial_month,
      stats_mode = excluded.stats_mode,
      stats_status = excluded.stats_status
  `);
  stmt.run(
    stats.location_id,
    stats.month,
    stats.avg_temp,
    stats.total_precipitation,
    stats.rainy_days,
    stats.aqi_avg,
    stats.weather_type_ratio,
    stats.sample_days,
    stats.expected_days,
    stats.is_partial_month,
    stats.stats_mode,
    stats.stats_status
  );
}

/**
 * 获取当前月统计
 * @param locationId 城市 LocationID
 * @returns 当前月统计或 undefined
 */
export function getCurrentMonthlyStats(locationId: string): MonthlyStatsRecord | undefined {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_stats_monthly
    WHERE location_id = ?
    ORDER BY month DESC LIMIT 1
  `);
  return stmt.get(locationId) as MonthlyStatsRecord | undefined;
}

/**
 * 获取最近 N 个月统计
 * @param locationId 城市 LocationID
 * @param count 月数
 * @returns 月统计列表
 */
export function getRecentMonthlyStats(
  locationId: string,
  count: number = 3
): MonthlyStatsRecord[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM weather_stats_monthly
    WHERE location_id = ?
    ORDER BY month DESC LIMIT ?
  `);
  return stmt.all(locationId, count) as MonthlyStatsRecord[];
}
