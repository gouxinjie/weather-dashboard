/**
 * @file 城市控制器
 * @description 处理城市搜索、定位解析等 API 请求
 */

import type { Request, Response } from 'express';
import { searchCities, resolveCityByLocation } from '../services/cityService';
import { success, error } from '../utils/response';
import { requiredString, validateCoordinates } from '../utils/validation';
import { logger } from '../utils/logger';
import { ErrorCodes } from '../types';

/**
 * 城市搜索
 * GET /api/cities/search?keyword=xxx
 */
export async function citySearch(req: Request, res: Response): Promise<void> {
  const keyword = req.query.keyword as string | undefined;

  const validation = requiredString(keyword, 'keyword');
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const list = await searchCities(keyword!);
    res.json(success({ list }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '城市搜索失败';
    res.json(error(ErrorCodes.CITY_NOT_FOUND, message));
  }
}

/**
 * 当前城市解析
 * POST /api/location/resolve-current
 */
export async function resolveCurrentCity(req: Request, res: Response): Promise<void> {
  const { lat, lon } = req.body as { lat?: string; lon?: string };

  const validation = validateCoordinates(lat, lon);
  if (!validation.valid) {
    res.json(error(validation.errorCode, validation.errorMessage));
    return;
  }

  try {
    const city = await resolveCityByLocation(lat!, lon!);
    res.json(success(city));
  } catch (err) {
    const message = err instanceof Error ? err.message : '定位解析失败';
    logger.error('定位解析失败', { lat, lon, message });
    res.json(error(ErrorCodes.LOCATION_RESOLVE_FAILED, message));
  }
}
