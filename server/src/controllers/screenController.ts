/**
 * @file 天气大屏控制器
 * @description 处理首页聚合、天气趋势、空气质量、预警等 API 请求
 */

import type { Request, Response } from 'express';
import {
  getWeatherNow,
  getHourlyWeather,
  getDailyWeather,
  getMinutelyPrecipitation,
  getAirNow,
  getAirHourlyTrend,
  getAlerts,
  getIndices,
  getTodaySummary,
  getAlertSummary,
  buildTodaySummaryFromDaily,
} from '../services/weatherService';
import { getWeeklyStats, getMonthlyStats, getStatsDetail } from '../services/statsService';
import { getCityInfo } from '../services/cityService';
import { success, error } from '../utils/response';
import { parseLocationId } from '../utils/validation';
import { ErrorCodes } from '../types';
import { logger } from '../utils/logger';
import type {
  HomeData,
  MonthlyStatsResponse,
  OverviewAirNow,
  OverviewTodaySummary,
  OverviewWeatherNow,
  WeeklyStatsResponse,
} from '../types';

/**
 * 模块级降级包装器
 * @param locationId 城市 LocationID
 * @param moduleName 模块名称
 * @param fallback 兜底数据
 * @param degradedModules 已降级模块列表
 * @param loader 实际加载函数
 * @returns 正常数据或兜底数据
 */
async function withModuleFallback<T>(
  locationId: string,
  moduleName: string,
  fallback: T,
  degradedModules: string[],
  loader: () => Promise<T>
): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    degradedModules.push(moduleName);
    logger.warn('天气大屏模块降级返回', { locationId, moduleName, message });
    return fallback;
  }
}

/**
 * 创建实时天气兜底数据
 * @returns 实时天气兜底数据
 */
function createFallbackWeatherNow(): OverviewWeatherNow {
  return {
    obsTime: '',
    temp: '--',
    feelsLike: '--',
    icon: '999',
    text: '暂无数据',
    windDir: '--',
    windScale: '--',
    windSpeed: '--',
    humidity: '--',
    precip: '--',
    pressure: '--',
    vis: '--',
    cloud: '--',
  };
}

/**
 * 创建今日摘要兜底数据
 * @returns 今日摘要兜底数据
 */
function createFallbackTodaySummary(): OverviewTodaySummary {
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
 * 创建空气质量兜底数据
 * @returns 空气质量兜底数据
 */
function createFallbackAirNow(): OverviewAirNow {
  return {
    pubTime: '',
    level: '--',
    aqi: '--',
    category: '--',
    primaryPollutant: '--',
    pm2p5: '--',
    pm10: '--',
    no2: '--',
    so2: '--',
    o3: '--',
    co: '--',
  };
}

/**
 * 创建周统计兜底数据
 * @returns 周统计兜底数据
 */
function createFallbackWeeklyStats(): WeeklyStatsResponse {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
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

/**
 * 创建月统计兜底数据
 * @returns 月统计兜底数据
 */
function createFallbackMonthlyStats(): MonthlyStatsResponse {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const expectedDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return {
    month,
    avgTemp: '--',
    totalPrecipitation: '0',
    rainyDays: 0,
    weatherTypeRatio: [],
    aqiAvg: '--',
    sampleDays: 0,
    expectedDays,
    isPartialMonth: true,
    statsMode: 'partial_month',
    statsStatus: 'no_data',
  };
}

/**
 * 格式化日期为 yyyy-MM-dd
 * @param date 日期对象
 * @returns 格式化后的日期
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 判断是否为城市不存在错误
 * @param err 异常对象
 * @returns 是否应映射为无效 LocationID
 */
function isLocationNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }

  return (
    err.message.includes('城市') && err.message.includes('不存在')
  ) || err.message.includes('Cannot find the location');
}

/**
 * 首页聚合接口
 * GET /api/screen/home?locationId=xxx
 */
export async function homeScreen(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;

  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  const lid = validation.value!;

  try {
    const degradedModules: string[] = [];
    const cityInfo = await getCityInfo(lid).catch((err: unknown) => {
      if (isLocationNotFoundError(err)) {
        res.json(error(ErrorCodes.INVALID_LOCATION_ID, '无效的城市 LocationID'));
        return null;
      }

      throw err;
    });

    if (!cityInfo) {
      return;
    }

    const fallbackWeatherNow = createFallbackWeatherNow();
    const fallbackTodaySummary = createFallbackTodaySummary();
    const fallbackAirNow = createFallbackAirNow();
    const fallbackWeeklyStats = createFallbackWeeklyStats();
    const fallbackMonthlyStats = createFallbackMonthlyStats();

    // 并行获取所有首页数据，单模块失败时降级为兜底数据
    const [
      weatherNow,
      airNow,
      alerts,
      hourly,
      minutely,
      daily,
      airHourly,
      indices,
      weeklyStats,
      monthlyStats,
    ] = await Promise.all([
      withModuleFallback(
        lid,
        'weatherNow',
        fallbackWeatherNow,
        degradedModules,
        () => getWeatherNow(lid)
      ),
      withModuleFallback(lid, 'airNow', fallbackAirNow, degradedModules, () => getAirNow(lid)),
      withModuleFallback(lid, 'alerts', [], degradedModules, () => getAlerts(lid)),
      withModuleFallback(lid, 'hourly', [], degradedModules, () => getHourlyWeather(lid)),
      withModuleFallback(
        lid,
        'minutely',
        { summary: '暂无降水数据', list: [] },
        degradedModules,
        () => getMinutelyPrecipitation(lid)
      ),
      withModuleFallback(lid, 'daily', [], degradedModules, () => getDailyWeather(lid, 7)),
      withModuleFallback(lid, 'airHourly', [], degradedModules, () => getAirHourlyTrend(lid)),
      withModuleFallback(lid, 'indices', [], degradedModules, () => getIndices(lid)),
      withModuleFallback(
        lid,
        'weeklyStats',
        fallbackWeeklyStats,
        degradedModules,
        () => getWeeklyStats(lid)
      ),
      withModuleFallback(
        lid,
        'monthlyStats',
        fallbackMonthlyStats,
        degradedModules,
        () => getMonthlyStats(lid)
      ),
    ]);

    const todaySummary =
      daily.length > 0 ? buildTodaySummaryFromDaily(daily) : fallbackTodaySummary;
    const alertSummary = getAlertSummary(alerts);

    const data: HomeData = {
      overview: {
        location: {
          id: cityInfo.id,
          name: cityInfo.name,
          adm1: cityInfo.adm1,
          adm2: cityInfo.adm2,
          lat: cityInfo.lat,
          lon: cityInfo.lon,
          tz: cityInfo.tz,
        },
        weatherNow,
        todaySummary,
        airNow,
        alertSummary,
      },
      hourly,
      minutely,
      daily,
      airNow,
      airHourly,
      alerts,
      indices,
      weeklyStats,
      monthlyStats,
    };

    const message =
      degradedModules.length > 0 ? '部分模块使用降级数据' : '操作成功';
    res.json(success(data, message));
  } catch (err) {
    const message = err instanceof Error ? err.message : '首页数据加载失败';
    logger.error('首页聚合接口失败', { locationId: lid, message });
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 首页概览接口
 * GET /api/screen/overview?locationId=xxx
 */
export async function overview(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;

  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  const lid = validation.value!;

  try {
    const degradedModules: string[] = [];
    const cityInfo = await getCityInfo(lid).catch((err: unknown) => {
      if (isLocationNotFoundError(err)) {
        res.json(error(ErrorCodes.INVALID_LOCATION_ID, '无效的城市 LocationID'));
        return null;
      }

      throw err;
    });

    if (!cityInfo) {
      return;
    }

    const [weatherNow, todaySummary, airNow, alerts] = await Promise.all([
      withModuleFallback(
        lid,
        'weatherNow',
        createFallbackWeatherNow(),
        degradedModules,
        () => getWeatherNow(lid)
      ),
      withModuleFallback(
        lid,
        'todaySummary',
        createFallbackTodaySummary(),
        degradedModules,
        () => getTodaySummary(lid)
      ),
      withModuleFallback(
        lid,
        'airNow',
        createFallbackAirNow(),
        degradedModules,
        () => getAirNow(lid)
      ),
      withModuleFallback(lid, 'alerts', [], degradedModules, () => getAlerts(lid)),
    ]);

    const alertSummary = getAlertSummary(alerts);

    const data = {
      location: {
        id: cityInfo.id,
        name: cityInfo.name,
        adm1: cityInfo.adm1,
        adm2: cityInfo.adm2,
        lat: cityInfo.lat,
        lon: cityInfo.lon,
        tz: cityInfo.tz,
      },
      weatherNow,
      todaySummary,
      airNow,
      alertSummary,
    };

    const message =
      degradedModules.length > 0 ? '部分模块使用降级数据' : '操作成功';
    res.json(success(data, message));
  } catch (err) {
    const message = err instanceof Error ? err.message : '概览数据加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 24 小时天气趋势
 * GET /api/screen/hourly?locationId=xxx
 */
export async function hourly(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getHourlyWeather(validation.value!);
    res.json(success({ list }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '小时趋势加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 分钟级降水
 * GET /api/screen/minutely?locationId=xxx
 */
export async function minutely(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getMinutelyPrecipitation(validation.value!);
    res.json(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : '降水数据加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 7 天预报
 * GET /api/screen/daily?locationId=xxx&days=7
 */
export async function daily(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  const days = parseInt(req.query.days as string, 10) || 7;

  try {
    const list = await getDailyWeather(validation.value!, days);
    res.json(success({ list }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '每日预报加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 实时空气质量
 * GET /api/screen/air/now?locationId=xxx
 */
export async function airNow(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getAirNow(validation.value!);
    res.json(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : '空气质量数据加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 空气质量小时趋势
 * GET /api/screen/air/hourly?locationId=xxx
 */
export async function airHourly(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getAirHourlyTrend(validation.value!);
    res.json(success({ list }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '空气质量趋势加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 预警信息
 * GET /api/screen/alerts?locationId=xxx
 */
export async function alerts(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getAlerts(validation.value!);
    res.json(success({ list }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '预警数据加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 生活指数
 * GET /api/screen/indices?locationId=xxx
 */
export async function indices(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getIndices(validation.value!);
    res.json(success({ list }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '生活指数加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 周统计
 * GET /api/screen/stats/weekly?locationId=xxx
 */
export async function weeklyStats(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getWeeklyStats(validation.value!);
    res.json(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : '周统计加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 月统计
 * GET /api/screen/stats/monthly?locationId=xxx
 */
export async function monthlyStats(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getMonthlyStats(validation.value!);
    res.json(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : '月统计加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}

/**
 * 统计详情
 * GET /api/screen/stats/detail?locationId=xxx
 */
export async function statsDetail(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;
  const validation = parseLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getStatsDetail(validation.value!);
    res.json(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : '统计详情加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}
