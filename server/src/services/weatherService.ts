/**
 * @file 天气服务
 * @description 天气数据获取、缓存、快照存储等业务逻辑
 */

import { qweatherApi } from '../integrations/qweather/client';
import {
  transformWeatherNow,
  transformHourly,
  transformDaily,
  transformMinutely,
  transformAirNow,
  transformAirHourly,
  transformAlerts,
  transformIndices,
} from '../integrations/qweather/transform';
import { getCityInfo } from './cityService';
import {
  insertWeatherNowSnapshot,
  getLatestWeatherNow,
  insertHourlySnapshots,
  getLatestHourly,
  insertDailySnapshots,
  getLatestDaily,
  insertMinutelySnapshots,
  getLatestMinutely,
  insertAirNowSnapshot,
  getLatestAirNow,
  insertAirHourlySnapshots,
  getLatestAirHourly,
  upsertAlerts,
  getActiveAlerts,
  insertIndices,
  getLatestIndices,
} from '../repositories/weatherRepository';
import { cacheGet, cacheSet, cacheKey } from '../utils/cache';
import { CACHE_TTL } from '../constants';
import { logger } from '../utils/logger';
import type {
  OverviewAirNow,
  OverviewTodaySummary,
  OverviewWeatherNow,
  QWeatherAirHourlyItem,
  QWeatherAlertItem,
  QWeatherDailyItem,
  QWeatherHourlyItem,
  QWeatherIndexItem,
} from '../types';

/**
 * 解析城市坐标，供需要经纬度的新接口复用
 * @param locationId 城市 LocationID
 * @returns 城市经纬度
 */
async function getCityCoordinates(locationId: string): Promise<{ lat: string; lon: string }> {
  const city = await getCityInfo(locationId);

  return {
    lat: city.lat,
    lon: city.lon,
  };
}

/**
 * 获取实时天气（带缓存和快照落库）
 * @param locationId 城市 LocationID
 * @returns 实时天气数据
 */
export async function getWeatherNow(locationId: string): Promise<OverviewWeatherNow> {
  const ck = cacheKey('weather-now', locationId);
  const cached = cacheGet<OverviewWeatherNow>(ck);
  if (cached) return cached;

  try {
    const raw = await qweatherApi.getWeatherNow(locationId);
    const data = transformWeatherNow(raw);

    // 落库快照
    try {
      insertWeatherNowSnapshot({
        location_id: locationId,
        obs_time: data.obsTime,
        temp: parseFloat(data.temp) || 0,
        feels_like: parseFloat(data.feelsLike) || 0,
        icon: data.icon,
        text: data.text,
        wind_dir: data.windDir,
        wind_scale: data.windScale,
        wind_speed: parseFloat(data.windSpeed) || 0,
        humidity: parseFloat(data.humidity) || 0,
        precip: parseFloat(data.precip) || 0,
        pressure: parseFloat(data.pressure) || 0,
        visibility: parseFloat(data.vis) || 0,
        cloud: parseFloat(data.cloud) || 0,
      });
    } catch (dbErr) {
      logger.error('实时天气快照落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.WEATHER_NOW);
    return data;
  } catch (err) {
    logger.error('获取实时天气失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    // 兜底：使用最新快照
    const snapshot = getLatestWeatherNow(locationId);
    if (snapshot) {
      return {
        obsTime: snapshot.obs_time,
        temp: String(snapshot.temp || '--'),
        feelsLike: String(snapshot.feels_like || '--'),
        icon: snapshot.icon,
        text: snapshot.text,
        windDir: snapshot.wind_dir,
        windScale: snapshot.wind_scale,
        windSpeed: String(snapshot.wind_speed || '0'),
        humidity: String(snapshot.humidity || '--'),
        precip: String(snapshot.precip || '0.0'),
        pressure: String(snapshot.pressure || '--'),
        vis: String(snapshot.visibility || '--'),
        cloud: String(snapshot.cloud || '--'),
      };
    }
    throw err;
  }
}

/**
 * 获取逐小时天气（带缓存和快照落库）
 * @param locationId 城市 LocationID
 * @returns 逐小时天气列表
 */
export async function getHourlyWeather(locationId: string): Promise<QWeatherHourlyItem[]> {
  const ck = cacheKey('hourly', locationId);
  const cached = cacheGet<QWeatherHourlyItem[]>(ck);
  if (cached) return cached;

  try {
    const raw = await qweatherApi.getHourly(locationId);
    const data = transformHourly(raw);

    // 落库快照
    try {
      insertHourlySnapshots(locationId, data);
    } catch (dbErr) {
      logger.error('逐小时天气快照落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.HOURLY);
    return data;
  } catch (err) {
    logger.error('获取逐小时天气失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    // 兜底：使用最新快照
    const snapshot = getLatestHourly(locationId);
    if (snapshot.length > 0) return snapshot;

    throw err;
  }
}

/**
 * 获取每日预报（带缓存和快照落库）
 * @param locationId 城市 LocationID
 * @param days 天数
 * @returns 每日预报列表
 */
export async function getDailyWeather(
  locationId: string,
  days: number = 7
): Promise<QWeatherDailyItem[]> {
  const ck = cacheKey(`daily-${days}`, locationId);
  const cached = cacheGet<QWeatherDailyItem[]>(ck);
  if (cached) return cached;

  try {
    const raw = await qweatherApi.getDaily(locationId, days);
    const data = transformDaily(raw);

    // 落库快照
    try {
      insertDailySnapshots(locationId, data);
    } catch (dbErr) {
      logger.error('每日预报快照落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.DAILY);
    return data;
  } catch (err) {
    logger.error('获取每日预报失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    const snapshot = getLatestDaily(locationId, days);
    if (snapshot.length > 0) return snapshot;

    throw err;
  }
}

/**
 * 获取分钟级降水（带缓存和快照落库）
 * @param locationId 城市 LocationID
 * @returns 分钟级降水数据
 */
export async function getMinutelyPrecipitation(locationId: string): Promise<{
  summary: string;
  list: { fxTime: string; precip: string; type: string }[];
}> {
  const ck = cacheKey('minutely', locationId);
  const cached = cacheGet<{ summary: string; list: { fxTime: string; precip: string; type: string }[] }>(ck);
  if (cached) return cached;

  try {
    const { lat, lon } = await getCityCoordinates(locationId);
    const raw = await qweatherApi.getMinutely(lat, lon);
    const data = transformMinutely(raw);

    try {
      insertMinutelySnapshots(locationId, data.summary, data.list);
    } catch (dbErr) {
      logger.error('分钟级降水快照落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.MINUTELY);
    return data;
  } catch (err) {
    logger.error('获取分钟级降水失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    const snapshot = getLatestMinutely(locationId);
    if (snapshot.list.length > 0) return snapshot;

    return { summary: '暂无降水数据', list: [] };
  }
}

/**
 * 获取实时空气质量（带缓存和快照落库）
 * @param locationId 城市 LocationID
 * @returns 空气质量数据
 */
export async function getAirNow(locationId: string): Promise<OverviewAirNow> {
  const ck = cacheKey('air-now', locationId);
  const cached = cacheGet<OverviewAirNow>(ck);
  if (cached) return cached;

  try {
    const { lat, lon } = await getCityCoordinates(locationId);
    const raw = await qweatherApi.getAirNow(lat, lon);
    const data = transformAirNow(raw);

    try {
      insertAirNowSnapshot({
        location_id: locationId,
        pub_time: raw.pubTime,
        aqi: parseFloat(data.aqi) || 0,
        level: raw.level || '',
        category: data.category,
        primary_pollutant: data.primaryPollutant,
        pm2p5: parseFloat(data.pm2p5) || 0,
        pm10: parseFloat(data.pm10) || 0,
        no2: parseFloat(data.no2) || 0,
        so2: parseFloat(data.so2) || 0,
        o3: parseFloat(data.o3) || 0,
        co: parseFloat(data.co) || 0,
      });
    } catch (dbErr) {
      logger.error('空气质量快照落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.AIR_NOW);
    return data;
  } catch (err) {
    logger.error('获取空气质量失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    const snapshot = getLatestAirNow(locationId);
    if (snapshot) {
      return {
        pubTime: snapshot.pub_time,
        level: snapshot.level,
        aqi: String(snapshot.aqi || '--'),
        category: snapshot.category,
        primaryPollutant: snapshot.primary_pollutant,
        pm2p5: String(snapshot.pm2p5 || '--'),
        pm10: String(snapshot.pm10 || '--'),
        no2: String(snapshot.no2 || '--'),
        so2: String(snapshot.so2 || '--'),
        o3: String(snapshot.o3 || '--'),
        co: String(snapshot.co || '--'),
      };
    }
    throw err;
  }
}

/**
 * 获取空气质量小时趋势（带缓存和快照落库）
 * @param locationId 城市 LocationID
 * @returns 空气质量小时趋势列表
 */
export async function getAirHourlyTrend(locationId: string): Promise<QWeatherAirHourlyItem[]> {
  const ck = cacheKey('air-hourly', locationId);
  const cached = cacheGet<QWeatherAirHourlyItem[]>(ck);
  if (cached) return cached;

  try {
    const { lat, lon } = await getCityCoordinates(locationId);
    const raw = await qweatherApi.getAirHourly(lat, lon);
    const data = transformAirHourly(raw);

    try {
      insertAirHourlySnapshots(locationId, data);
    } catch (dbErr) {
      logger.error('空气质量小时预报快照落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.AIR_HOURLY);
    return data;
  } catch (err) {
    logger.error('获取空气质量小时趋势失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    const snapshot = getLatestAirHourly(locationId);
    if (snapshot.length > 0) return snapshot;

    throw err;
  }
}

/**
 * 获取预警信息（带缓存）
 * @param locationId 城市 LocationID
 * @returns 预警列表
 */
export async function getAlerts(locationId: string): Promise<QWeatherAlertItem[]> {
  const ck = cacheKey('alerts', locationId);
  const cached = cacheGet<QWeatherAlertItem[]>(ck);
  if (cached) return cached;

  try {
    const { lat, lon } = await getCityCoordinates(locationId);
    const raw = await qweatherApi.getAlerts(lat, lon);
    const data = transformAlerts(raw);

    try {
      upsertAlerts(
        locationId,
        data.map((a) => ({
          id: a.id,
          location_id: locationId,
          sender_name: a.senderName,
          pub_time: a.publishedAt || '',
          start_time: a.effectiveTime || '',
          end_time: a.expireTime || '',
          event_type: a.eventType,
          severity: a.severity,
          headline: a.headline,
          description: a.description,
          instruction: a.instruction,
        }))
      );
    } catch (dbErr) {
      logger.error('预警数据落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.ALERTS);
    return data;
  } catch (err) {
    logger.error('获取预警信息失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    const alerts = getActiveAlerts(locationId);
    if (alerts.length > 0) {
      return alerts.map((a) => ({
        id: a.id,
        senderName: a.sender_name,
        publishedAt: a.pub_time,
        effectiveTime: a.start_time,
        expireTime: a.end_time,
        eventType: a.event_type,
        severity: a.severity,
        headline: a.headline,
        description: a.description,
        instruction: a.instruction,
      }));
    }

    return [];
  }
}

/**
 * 获取生活指数（带缓存）
 * @param locationId 城市 LocationID
 * @returns 生活指数列表
 */
export async function getIndices(locationId: string): Promise<QWeatherIndexItem[]> {
  const ck = cacheKey('indices', locationId);
  const cached = cacheGet<QWeatherIndexItem[]>(ck);
  if (cached) return cached;

  try {
    const raw = await qweatherApi.getIndices(locationId);
    const data = transformIndices(raw);

    try {
      insertIndices(
        locationId,
        data.map((i) => ({
          id: 0,
          location_id: locationId,
          date: i.date,
          type: i.type,
          name: i.name,
          level: i.level,
          category: i.category,
          text: i.text,
        }))
      );
    } catch (dbErr) {
      logger.error('生活指数落库失败', { locationId, error: String(dbErr) });
    }

    cacheSet(ck, data, CACHE_TTL.INDICES);
    return data;
  } catch (err) {
    logger.error('获取生活指数失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });

    const indices = getLatestIndices(locationId);
    if (indices.length > 0) {
      return indices.map((i) => ({
        date: i.date,
        type: i.type,
        name: i.name,
        level: i.level,
        category: i.category,
        text: i.text,
      }));
    }

    return [];
  }
}

/**
 * 获取今日摘要信息
 * @param locationId 城市 LocationID
 * @returns 今日摘要（高温、低温、日出日落、紫外线等）
 */
export function buildTodaySummaryFromDaily(daily: QWeatherDailyItem[]): OverviewTodaySummary {
  const today = daily[0];

  if (today) {
    return {
      tempMax: today.tempMax,
      tempMin: today.tempMin,
      uvIndex: today.uvIndex,
      sunrise: today.sunrise,
      sunset: today.sunset,
      statsMode: 'current_day_summary',
    };
  }

  return {
    tempMax: '--',
    tempMin: '--',
    uvIndex: '--',
    sunrise: '--:--',
    sunset: '--:--',
    statsMode: 'fallback',
  };
}

export async function getTodaySummary(locationId: string): Promise<OverviewTodaySummary> {
  try {
    const daily = await getDailyWeather(locationId, 3);
    return buildTodaySummaryFromDaily(daily);
  } catch {
    // 兜底使用默认值
  }

  return {
    tempMax: '--',
    tempMin: '--',
    uvIndex: '--',
    sunrise: '--:--',
    sunset: '--:--',
    statsMode: 'fallback',
  };
}

/**
 * 获取预警摘要
 * @param alerts 预警列表
 * @returns 预警摘要
 */
export function getAlertSummary(alerts: QWeatherAlertItem[]): {
  hasAlert: boolean;
  count: number;
  highestSeverity: string | null;
} {
  const active = alerts.filter((a) => {
    if (!a.expireTime) return true;
    return new Date(a.expireTime) > new Date();
  });

  if (active.length === 0) {
    return { hasAlert: false, count: 0, highestSeverity: null };
  }

  // 预警等级排序：红色 > 橙色 > 黄色 > 蓝色
  const severityOrder: Record<string, number> = {
    '红色': 4,
    '橙色': 3,
    '黄色': 2,
    '蓝色': 1,
  };

  let highestSeverity: string | null = null;
  let highestOrder = 0;

  for (const alert of active) {
    const order = severityOrder[alert.severity] || 0;
    if (order > highestOrder) {
      highestOrder = order;
      highestSeverity = alert.severity;
    }
  }

  return {
    hasAlert: true,
    count: active.length,
    highestSeverity,
  };
}
