/**
 * @file 城市服务
 * @description 城市搜索、定位解析等业务逻辑
 */

import { qweatherApi } from '../integrations/qweather/client';
import {
  findCityById,
  searchCitiesByName,
  upsertCities,
} from '../repositories/cityRepository';
import { logger } from '../utils/logger';
import type { QWeatherCityResult } from '../types';

/**
 * 搜索城市
 * @param keyword 搜索关键字
 * @returns 城市列表
 */
export async function searchCities(keyword: string): Promise<QWeatherCityResult[]> {
  // 优先从本地数据库搜索
  const localResults = searchCitiesByName(keyword, 10);
  if (localResults.length > 0) {
    return localResults.map((r) => ({
      id: r.id,
      name: r.name,
      adm1: r.adm1,
      adm2: r.adm2,
      country: r.country,
      lat: r.lat,
      lon: r.lon,
      tz: r.tz,
      utcOffset: r.utc_offset,
      type: r.type,
    }));
  }

  // 本地无结果，从和风天气搜索
  try {
    const results = await qweatherApi.searchCities(keyword);
    if (results.length > 0) {
      // 将搜索结果写入本地
      upsertCities(results);
    }
    return results;
  } catch (err) {
    logger.error('城市搜索失败', { keyword, error: err instanceof Error ? err.message : '未知错误' });
    throw new Error('城市搜索失败，请稍后重试');
  }
}

/**
 * 根据坐标解析当前城市
 * @param lat 纬度
 * @param lon 经度
 * @returns 城市信息
 */
export async function resolveCityByLocation(
  lat: string,
  lon: string
): Promise<QWeatherCityResult> {
  try {
    const results = await qweatherApi.cityByLocation(lat, lon);
    if (results.length === 0) {
      throw new Error('无法根据坐标解析城市');
    }

    // 写入本地数据库
    upsertCities(results);

    // 返回第一个匹配的城市级结果
    const city = results.find((r) => r.type === 'city') || results[0];
    return city;
  } catch (err) {
    logger.error('坐标解析城市失败', {
      lat,
      lon,
      error: err instanceof Error ? err.message : '未知错误',
    });
    throw new Error('无法根据当前位置解析城市');
  }
}

/**
 * 获取城市信息（优先本地，本地无则远程查询入库）
 * @param locationId 城市 LocationID
 * @returns 城市信息
 */
export async function getCityInfo(locationId: string): Promise<QWeatherCityResult> {
  // 优先从本地数据库查找
  const city = findCityById(locationId);
  if (city) {
    return {
      id: city.id,
      name: city.name,
      adm1: city.adm1,
      adm2: city.adm2,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
      tz: city.tz,
      utcOffset: city.utc_offset,
      type: city.type,
    };
  }

  // 本地无数据，从和风天气远程查询
  try {
    const results = await qweatherApi.searchCities(locationId);
    if (results.length === 0) {
      throw new Error(`城市 ${locationId} 不存在`);
    }
    
    // 写入本地数据库
    upsertCities(results);

    // 返回精确匹配的城市
    const exactMatch = results.find((r) => r.id === locationId);
    const target = exactMatch || results[0];
    return target;
  } catch (err) {
    logger.error('远程获取城市信息失败', { locationId, error: err instanceof Error ? err.message : '未知错误' });
    throw err instanceof Error ? err : new Error(`城市 ${locationId} 不存在`);
  }
}
