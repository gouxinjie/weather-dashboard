/**
 * @file API 请求封装
 * @description 统一管理所有前端 HTTP 请求，包含错误处理和请求拦截
 */

import type { ApiResponse } from '../types';
import { API_BASE, SYSTEM_USER_ID } from '../constants';

/**
 * 发起 GET 请求
 * @param url 请求路径
 * @param params 查询参数
 * @returns 响应数据
 */
export async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams({
    userId: SYSTEM_USER_ID,
    ...(params || {}),
  });
  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.message || '请求失败');
  }

  return json.data;
}

/**
 * 发起 POST 请求
 * @param url 请求路径
 * @param body 请求体
 * @returns 响应数据
 */
export async function post<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: SYSTEM_USER_ID,
      ...body,
    }),
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.message || '请求失败');
  }

  return json.data;
}

/**
 * API 模块封装
 */
export const api = {
  /** 城市搜索 */
  searchCities: (keyword: string) =>
    get<{ list: import('../types').CityInfo[] }>(`${API_BASE}/cities/search`, { keyword }),

  /** 当前城市解析 */
  resolveCurrentCity: (lat: string, lon: string) =>
    post<import('../types').CityInfo>(`${API_BASE}/location/resolve-current`, { lat, lon }),

  /** 首页聚合数据 */
  getHomeData: (locationId: string) =>
    get<import('../types').HomeData>(`${API_BASE}/screen/home`, { locationId }),

  /** 24 小时趋势 */
  getHourly: (locationId: string) =>
    get<{ list: import('../types').HourlyItem[] }>(`${API_BASE}/screen/hourly`, { locationId }),

  /** 分钟级降水 */
  getMinutely: (locationId: string) =>
    get<import('../types').MinutelyPrecip>(`${API_BASE}/screen/minutely`, { locationId }),

  /** 7 天预报 */
  getDaily: (locationId: string, days?: number) =>
    get<{ list: import('../types').DailyItem[] }>(`${API_BASE}/screen/daily`, {
      locationId,
      days: String(days ?? 7),
    }),

  /** 实时空气质量 */
  getAirNow: (locationId: string) =>
    get<import('../types').AirNow>(`${API_BASE}/screen/air/now`, { locationId }),

  /** 空气质量小时趋势 */
  getAirHourly: (locationId: string) =>
    get<{ list: import('../types').AirHourlyItem[] }>(`${API_BASE}/screen/air/hourly`, { locationId }),

  /** 预警 */
  getAlerts: (locationId: string) =>
    get<{ list: import('../types').AlertItem[] }>(`${API_BASE}/screen/alerts`, { locationId }),

  /** 生活指数 */
  getIndices: (locationId: string) =>
    get<{ list: import('../types').IndexItem[] }>(`${API_BASE}/screen/indices`, { locationId }),

  /** 周统计 */
  getWeeklyStats: (locationId: string) =>
    get<import('../types').WeeklyStats>(`${API_BASE}/screen/stats/weekly`, { locationId }),

  /** 月统计 */
  getMonthlyStats: (locationId: string) =>
    get<import('../types').MonthlyStats>(`${API_BASE}/screen/stats/monthly`, { locationId }),

  /** 统计详情 */
  getStatsDetail: (locationId: string) =>
    get<import('../types').StatsDetailData>(`${API_BASE}/screen/stats/detail`, { locationId }),
};
