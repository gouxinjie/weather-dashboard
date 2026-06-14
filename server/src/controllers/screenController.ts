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
} from '../services/weatherService';
import { getWeeklyStats, getMonthlyStats, getStatsDetail } from '../services/statsService';
import { getCityInfo } from '../services/cityService';
import { success, error } from '../utils/response';
import { validateLocationId } from '../utils/validation';
import { ErrorCodes } from '../types';
import { logger } from '../utils/logger';
import type { HomeData } from '../types';

/**
 * 首页聚合接口
 * GET /api/screen/home?locationId=xxx
 */
export async function homeScreen(req: Request, res: Response): Promise<void> {
  const locationId = req.query.locationId as string | undefined;

  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  const lid = locationId!;

  try {
    // 并行获取所有首页数据
    const [
      cityInfo,
      weatherNow,
      todaySummary,
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
      getCityInfo(lid),
      getWeatherNow(lid),
      getTodaySummary(lid),
      getAirNow(lid),
      getAlerts(lid),
      getHourlyWeather(lid),
      getMinutelyPrecipitation(lid),
      getDailyWeather(lid, 7),
      getAirHourlyTrend(lid),
      getIndices(lid),
      getWeeklyStats(lid),
      getMonthlyStats(lid),
    ]);

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

    res.json(success(data));
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

  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  const lid = locationId!;

  try {
    const [cityInfo, weatherNow, todaySummary, airNow, alerts] = await Promise.all([
      getCityInfo(lid),
      getWeatherNow(lid),
      getTodaySummary(lid),
      getAirNow(lid),
      getAlerts(lid),
    ]);

    const alertSummary = getAlertSummary(alerts);

    res.json(
      success({
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
      })
    );
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getHourlyWeather(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getMinutelyPrecipitation(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  const days = parseInt(req.query.days as string, 10) || 7;

  try {
    const list = await getDailyWeather(locationId!, days);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getAirNow(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getAirHourlyTrend(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getAlerts(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await getIndices(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getWeeklyStats(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getMonthlyStats(locationId!);
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
  const validation = validateLocationId(locationId);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const data = await getStatsDetail(locationId!);
    res.json(success(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : '统计详情加载失败';
    res.json(error(ErrorCodes.INTERNAL_SERVER_ERROR, message));
  }
}
