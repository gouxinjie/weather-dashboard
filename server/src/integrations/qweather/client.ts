/**
 * @file 和风天气 API 客户端
 * @description 集中封装和风天气第三方请求、错误处理与字段提取
 */

import { config } from '../../app/config';
import { logger } from '../../utils/logger';
import type {
  QWeatherAlertItem,
  QWeatherAirHourlyItem,
  QWeatherAirNow,
  QWeatherCityResult,
  QWeatherDailyItem,
  QWeatherHistoricalAirHourlyItem,
  QWeatherHistoricalWeatherDaily,
  QWeatherHistoricalWeatherHourlyItem,
  QWeatherHourlyItem,
  QWeatherIndexItem,
  QWeatherMinutelyItem,
  QWeatherNow,
} from '../../types';

/** 和风天气请求参数 */
type RequestParams = Record<string, string>;

/** 新版空气质量指数结构 */
interface QWeatherAirIndexRaw {
  code?: string;
  name?: string;
  aqi?: number | string;
  category?: string;
  primaryPollutant?: {
    code?: string;
    name?: string;
  };
}

/** 新版空气质量污染物结构 */
interface QWeatherAirPollutantRaw {
  code?: string;
  concentration?: {
    value?: number | string;
  };
}

/** 新版空气质量实时响应结构 */
interface QWeatherAirCurrentResponseRaw {
  indexes?: QWeatherAirIndexRaw[];
  pollutants?: QWeatherAirPollutantRaw[];
}

/** 新版空气质量小时响应结构 */
interface QWeatherAirHourlyResponseRaw {
  hours?: Array<{
    forecastTime?: string;
    indexes?: QWeatherAirIndexRaw[];
  }>;
}

/** 新版预警颜色结构 */
interface QWeatherAlertColorRaw {
  code?: string;
  name?: string;
}

/** 新版预警事件结构 */
interface QWeatherAlertEventTypeRaw {
  code?: string;
  name?: string;
}

/** 新版预警响应项 */
interface QWeatherAlertRaw {
  id?: string;
  senderName?: string;
  issuedTime?: string;
  effectiveTime?: string;
  expireTime?: string;
  headline?: string;
  description?: string;
  instruction?: string;
  severity?: string;
  color?: QWeatherAlertColorRaw;
  eventType?: QWeatherAlertEventTypeRaw;
}

/** 新版预警响应结构 */
interface QWeatherAlertsResponseRaw {
  alerts?: QWeatherAlertRaw[];
}

/**
 * 判断值是否为对象
 * @param value 待判断值
 * @returns 是否为普通对象
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 构造和风请求地址
 * @param pathname 接口路径
 * @param params 查询参数
 * @returns 完整请求地址
 * @throws 当未配置 API Host 或 API Key 时抛出异常
 */
function buildRequestUrl(pathname: string, params: RequestParams): string {
  if (!config.qweatherApiHost) {
    throw new Error('未配置 QWEATHER_API_HOST，请在 server/.env 中填写和风控制台分配的专属 API Host');
  }

  if (!config.qweatherApiKey) {
    throw new Error('未配置 QWEATHER_API_KEY，请在 server/.env 中填写和风天气 API Key');
  }

  const searchParams = new URLSearchParams({ key: config.qweatherApiKey, ...params });
  return `https://${config.qweatherApiHost}${pathname}?${searchParams.toString()}`;
}

/**
 * 脱敏 URL，避免日志输出敏感 Key
 * @param url 原始 URL
 * @returns 脱敏后的 URL
 */
function maskUrl(url: string): string {
  return url.replace(config.qweatherApiKey, '***');
}

/**
 * 读取 JSON 响应
 * @param response Fetch 响应对象
 * @returns JSON 对象或空对象
 */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

/**
 * 解析 HTTP 失败信息
 * @param status HTTP 状态码
 * @param body 响应体
 * @returns 中文错误信息
 */
function getHttpErrorMessage(status: number, body: unknown): string {
  const fallback = `和风天气 API 请求失败，状态码：${status}`;

  if (!isRecord(body)) {
    return fallback;
  }

  const error = body.error;
  if (isRecord(error)) {
    const type = typeof error.type === 'string' ? error.type : '';
    const detail = typeof error.detail === 'string' ? error.detail : '';

    if (status === 403 && type.includes('invalid-host')) {
      return '和风天气 API Host 无效或未授权，请在和风控制台设置中复制专属 API Host 并写入 QWEATHER_API_HOST';
    }

    if (status === 429) {
      return '和风天气 API 请求频率超限';
    }

    if (detail) {
      return `和风天气 API 请求失败：${detail}`;
    }
  }

  if (typeof body.message === 'string' && body.message) {
    return `和风天气 API 请求失败：${body.message}`;
  }

  if (status === 401) {
    return '和风天气 API 鉴权失败，请检查 QWEATHER_API_KEY 是否有效';
  }

  return fallback;
}

/**
 * 提取和风业务错误信息
 * @param body 响应体
 * @returns 中文错误信息；若不是业务错误则返回 null
 */
function getBusinessErrorMessage(body: unknown): string | null {
  if (!isRecord(body) || typeof body.code !== 'string') {
    return null;
  }

  if (body.code === '200') {
    return null;
  }

  return `和风天气 API 返回业务错误，code：${body.code}`;
}

/**
 * 读取指定字段
 * @param body 响应体
 * @param key 字段名
 * @returns 对应字段值
 * @throws 当字段不存在时抛出异常
 */
function getBodyField<T>(body: unknown, key: string): T {
  if (!isRecord(body) || !(key in body)) {
    throw new Error(`和风天气 API 响应缺少字段：${key}`);
  }

  return body[key] as T;
}

/**
 * 发起和风天气 API 请求
 * @param pathname 接口路径
 * @param params 查询参数
 * @returns 响应体
 * @throws 当网络、超时或业务失败时抛出异常
 */
async function qweatherRequest(pathname: string, params: RequestParams): Promise<unknown> {
  const url = buildRequestUrl(pathname, params);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await readJson(response);

    if (!response.ok) {
      throw new Error(getHttpErrorMessage(response.status, body));
    }

    const businessError = getBusinessErrorMessage(body);
    if (businessError) {
      logger.error('和风天气 API 返回业务错误', { url: maskUrl(url), body });
      throw new Error(businessError);
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('和风天气 API 请求超时');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 提取空气质量优先指数
 * @param indexes 指数列表
 * @returns 优先使用的指数
 */
function pickPrimaryAirIndex(indexes: QWeatherAirIndexRaw[]): QWeatherAirIndexRaw | undefined {
  const preferredCodes = ['cn-aqi', 'qaqi', 'aqi'];

  for (const code of preferredCodes) {
    const target = indexes.find((item) => item.code?.toLowerCase() === code);
    if (target) {
      return target;
    }
  }

  return indexes[0];
}

/**
 * 提取污染物浓度
 * @param pollutants 污染物列表
 * @param code 污染物编码
 * @returns 浓度字符串
 */
function getPollutantValue(
  pollutants: QWeatherAirPollutantRaw[] | undefined,
  code: string
): string {
  const item = pollutants?.find((pollutant) => pollutant.code?.toLowerCase() === code);
  const value = item?.concentration?.value;
  return value !== undefined ? String(value) : '--';
}

/**
 * 格式化坐标查询参数
 * @param lat 纬度
 * @param lon 经度
 * @returns 和风接口要求的经纬度字符串
 */
function formatLocation(lat: string, lon: string): string {
  const latNum = Number.parseFloat(lat);
  const lonNum = Number.parseFloat(lon);

  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    throw new Error('城市坐标无效，无法请求和风天气接口');
  }

  return `${lonNum.toFixed(2)},${latNum.toFixed(2)}`;
}

/**
 * 格式化路径坐标片段
 * @param value 坐标值
 * @returns 保留两位小数的路径片段
 */
function formatCoordinateSegment(value: string): string {
  const numberValue = Number.parseFloat(value);
  if (Number.isNaN(numberValue)) {
    throw new Error('城市坐标无效，无法请求和风天气接口');
  }
  return numberValue.toFixed(2);
}

/**
 * 映射预警颜色到中文等级
 * @param color 颜色对象
 * @param severity 严重程度
 * @returns 中文等级
 */
function mapAlertSeverity(color?: QWeatherAlertColorRaw, severity?: string): string {
  const code = color?.code?.toLowerCase();

  if (code === 'blue') return '蓝色';
  if (code === 'yellow') return '黄色';
  if (code === 'orange') return '橙色';
  if (code === 'red') return '红色';

  if (color?.name) {
    return color.name;
  }

  return severity || '';
}

/**
 * 和风天气 API 客户端
 */
export const qweatherApi = {
  /**
   * 城市搜索
   * @param keyword 搜索关键词
   * @returns 城市列表
   */
  async searchCities(keyword: string): Promise<QWeatherCityResult[]> {
    const body = await qweatherRequest('/geo/v2/city/lookup', { location: keyword });
    return getBodyField<QWeatherCityResult[]>(body, 'location');
  },

  /**
   * 根据坐标解析城市
   * @param lat 纬度
   * @param lon 经度
   * @returns 城市列表
   */
  async cityByLocation(lat: string, lon: string): Promise<QWeatherCityResult[]> {
    const body = await qweatherRequest('/geo/v2/city/lookup', {
      location: formatLocation(lat, lon),
    });
    return getBodyField<QWeatherCityResult[]>(body, 'location');
  },

  /**
   * 获取实时天气
   * @param locationId 城市 LocationID
   * @returns 实时天气
   */
  async getWeatherNow(locationId: string): Promise<QWeatherNow> {
    const body = await qweatherRequest('/v7/weather/now', { location: locationId });
    return getBodyField<QWeatherNow>(body, 'now');
  },

  /**
   * 获取逐小时天气
   * @param locationId 城市 LocationID
   * @returns 逐小时天气列表
   */
  async getHourly(locationId: string): Promise<QWeatherHourlyItem[]> {
    const body = await qweatherRequest('/v7/weather/24h', { location: locationId });
    return getBodyField<QWeatherHourlyItem[]>(body, 'hourly');
  },

  /**
   * 获取每日天气预报
   * @param locationId 城市 LocationID
   * @param days 天数
   * @returns 每日天气列表
   */
  async getDaily(locationId: string, days: number = 7): Promise<QWeatherDailyItem[]> {
    const body = await qweatherRequest(`/v7/weather/${days}d`, { location: locationId });
    return getBodyField<QWeatherDailyItem[]>(body, 'daily');
  },

  /**
   * 获取历史天气
   * @param locationId 城市 LocationID
   * @param date 日期，格式 yyyyMMdd
   * @returns 历史天气日级与小时级数据
   */
  async getHistoricalWeather(
    locationId: string,
    date: string
  ): Promise<{
    weatherDaily: QWeatherHistoricalWeatherDaily;
    weatherHourly: QWeatherHistoricalWeatherHourlyItem[];
  }> {
    const body = await qweatherRequest('/v7/historical/weather', {
      location: locationId,
      date,
    });

    return {
      weatherDaily: getBodyField<QWeatherHistoricalWeatherDaily>(body, 'weatherDaily'),
      weatherHourly: getBodyField<QWeatherHistoricalWeatherHourlyItem[]>(body, 'weatherHourly'),
    };
  },

  /**
   * 获取分钟级降水
   * @param lat 纬度
   * @param lon 经度
   * @returns 分钟级降水数据
   */
  async getMinutely(
    lat: string,
    lon: string
  ): Promise<{ summary: string; minutely: QWeatherMinutelyItem[] }> {
    const body = await qweatherRequest('/v7/minutely/5m', {
      location: formatLocation(lat, lon),
    });

    return {
      summary: getBodyField<string>(body, 'summary'),
      minutely: getBodyField<QWeatherMinutelyItem[]>(body, 'minutely'),
    };
  },

  /**
   * 获取实时空气质量
   * @param lat 纬度
   * @param lon 经度
   * @returns 兼容现有业务结构的空气质量数据
   */
  async getAirNow(lat: string, lon: string): Promise<QWeatherAirNow> {
    const path = `/airquality/v1/current/${formatCoordinateSegment(lat)}/${formatCoordinateSegment(lon)}`;
    const body = await qweatherRequest(path, { lang: 'zh' });
    const raw = body as QWeatherAirCurrentResponseRaw;
    const indexes = raw.indexes || [];
    const primaryIndex = pickPrimaryAirIndex(indexes);

    return {
      pubTime: new Date().toISOString(),
      aqi: primaryIndex?.aqi !== undefined ? String(primaryIndex.aqi) : '--',
      level: primaryIndex?.name || '',
      category: primaryIndex?.category || '',
      primary: primaryIndex?.primaryPollutant?.name || '',
      pm2p5: getPollutantValue(raw.pollutants, 'pm2p5'),
      pm10: getPollutantValue(raw.pollutants, 'pm10'),
      no2: getPollutantValue(raw.pollutants, 'no2'),
      so2: getPollutantValue(raw.pollutants, 'so2'),
      o3: getPollutantValue(raw.pollutants, 'o3'),
      co: getPollutantValue(raw.pollutants, 'co'),
    };
  },

  /**
   * 获取空气质量小时趋势
   * @param lat 纬度
   * @param lon 经度
   * @returns 兼容现有业务结构的小时趋势列表
   */
  async getAirHourly(lat: string, lon: string): Promise<QWeatherAirHourlyItem[]> {
    const path = `/airquality/v1/hourly/${formatCoordinateSegment(lat)}/${formatCoordinateSegment(lon)}`;
    const body = await qweatherRequest(path, { lang: 'zh' });
    const raw = body as QWeatherAirHourlyResponseRaw;

    return (raw.hours || []).map((item) => {
      const primaryIndex = pickPrimaryAirIndex(item.indexes || []);

      return {
        fxTime: item.forecastTime || '',
        aqi: primaryIndex?.aqi !== undefined ? String(primaryIndex.aqi) : '--',
        category: primaryIndex?.category || '',
        primaryPollutant: primaryIndex?.primaryPollutant?.name || '',
      };
    });
  },

  /**
   * 获取历史空气质量
   * @param locationId 城市 LocationID
   * @param date 日期，格式 yyyyMMdd
   * @returns 历史空气质量小时数据
   */
  async getHistoricalAir(
    locationId: string,
    date: string
  ): Promise<QWeatherHistoricalAirHourlyItem[]> {
    const body = await qweatherRequest('/v7/historical/air', {
      location: locationId,
      date,
    });
    return getBodyField<QWeatherHistoricalAirHourlyItem[]>(body, 'airHourly');
  },

  /**
   * 获取实时天气预警
   * @param lat 纬度
   * @param lon 经度
   * @returns 兼容现有业务结构的预警列表
   */
  async getAlerts(lat: string, lon: string): Promise<QWeatherAlertItem[]> {
    const path = `/weatheralert/v1/current/${formatCoordinateSegment(lat)}/${formatCoordinateSegment(lon)}`;
    const body = await qweatherRequest(path, { lang: 'zh' });
    const raw = body as QWeatherAlertsResponseRaw;

    return (raw.alerts || []).map((item) => ({
      id: item.id || '',
      senderName: item.senderName || '',
      publishedAt: item.issuedTime || '',
      effectiveTime: item.effectiveTime || '',
      expireTime: item.expireTime || '',
      eventType: item.eventType?.name || item.eventType?.code || '',
      severity: mapAlertSeverity(item.color, item.severity),
      headline: item.headline || '',
      description: item.description || '',
      instruction: item.instruction || '',
    }));
  },

  /**
   * 获取生活指数
   * @param locationId 城市 LocationID
   * @param type 指数类型
   * @returns 指数列表
   */
  async getIndices(locationId: string, type: string = '0'): Promise<QWeatherIndexItem[]> {
    const body = await qweatherRequest('/v7/indices/1d', {
      location: locationId,
      type,
    });
    return getBodyField<QWeatherIndexItem[]>(body, 'daily');
  },
};
