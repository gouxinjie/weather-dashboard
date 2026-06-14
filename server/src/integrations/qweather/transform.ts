/**
 * @file 和风天气数据转换工具
 * @description 将和风天气原始响应转换为统一的业务数据格式
 */

import type {
  QWeatherNow,
  QWeatherHourlyItem,
  QWeatherDailyItem,
  QWeatherAirNow,
  QWeatherAirHourlyItem,
  QWeatherAlertItem,
  QWeatherIndexItem,
  QWeatherMinutelyItem,
  OverviewWeatherNow,
  OverviewAirNow,
} from '../../types';

/**
 * 转换实时天气数据
 * @param raw 和风天气原始实时天气数据
 * @returns 统一格式的实时天气
 */
export function transformWeatherNow(raw: QWeatherNow): OverviewWeatherNow {
  return {
    obsTime: raw.obsTime || '',
    temp: raw.temp || '--',
    feelsLike: raw.feelsLike || '--',
    icon: raw.icon || '',
    text: raw.text || '',
    windDir: raw.windDir || '',
    windScale: raw.windScale || '',
    windSpeed: raw.windSpeed || '0',
    humidity: raw.humidity || '--',
    precip: raw.precip || '0.0',
    pressure: raw.pressure || '--',
    vis: raw.vis || '--',
    cloud: raw.cloud || '--',
  };
}

/**
 * 转换逐小时天气数据
 * @param raw 和风天气原始逐小时数据列表
 * @returns 统一格式的逐小时天气列表
 */
export function transformHourly(raw: QWeatherHourlyItem[]): QWeatherHourlyItem[] {
  return raw.map((item) => ({
    fxTime: item.fxTime || '',
    temp: item.temp || '--',
    icon: item.icon || '',
    text: item.text || '',
    pop: item.pop || '0',
    windDir: item.windDir || '',
    windScale: item.windScale || '',
    windSpeed: item.windSpeed || '0',
    humidity: item.humidity || '--',
    pressure: item.pressure || '--',
    cloud: item.cloud || '--',
  }));
}

/**
 * 转换每日天气预报
 * @param raw 和风天气原始每日预报数据列表
 * @returns 统一格式的每日预报列表
 */
export function transformDaily(raw: QWeatherDailyItem[]): QWeatherDailyItem[] {
  return raw.map((item) => ({
    fxDate: item.fxDate || '',
    sunrise: item.sunrise || '',
    sunset: item.sunset || '',
    tempMax: item.tempMax || '--',
    tempMin: item.tempMin || '--',
    iconDay: item.iconDay || '',
    textDay: item.textDay || '',
    iconNight: item.iconNight || '',
    textNight: item.textNight || '',
    precip: item.precip || '0.0',
    humidity: item.humidity || '--',
    pressure: item.pressure || '--',
    uvIndex: item.uvIndex || '--',
    windDirDay: item.windDirDay || '',
    windScaleDay: item.windScaleDay || '',
  }));
}

/**
 * 转换分钟级降水数据
 * @param raw 和风天气原始分钟级降水数据
 * @returns 统一格式的分钟级降水
 */
export function transformMinutely(raw: {
  summary: string;
  minutely: QWeatherMinutelyItem[];
}): { summary: string; list: QWeatherMinutelyItem[] } {
  return {
    summary: raw.summary || '暂无降水',
    list: (raw.minutely || []).map((item) => ({
      fxTime: item.fxTime || '',
      precip: item.precip || '0',
      type: item.type || 'none',
    })),
  };
}

/**
 * 转换实时空气质量
 * @param raw 和风天气原始空气质量数据
 * @returns 统一格式的空气质量
 */
export function transformAirNow(raw: QWeatherAirNow): OverviewAirNow {
  return {
    pubTime: raw.pubTime || '',
    level: raw.level || '',
    aqi: raw.aqi || '--',
    category: raw.category || '',
    primaryPollutant: raw.primary || '',
    pm2p5: raw.pm2p5 || '--',
    pm10: raw.pm10 || '--',
    no2: raw.no2 || '--',
    so2: raw.so2 || '--',
    o3: raw.o3 || '--',
    co: raw.co || '--',
  };
}

/**
 * 转换空气质量小时预报
 * @param raw 和风天气原始空气质量小时预报列表
 * @returns 统一格式的空气质量小时预报
 */
export function transformAirHourly(raw: QWeatherAirHourlyItem[]): QWeatherAirHourlyItem[] {
  return raw.map((item) => ({
    fxTime: item.fxTime || '',
    aqi: item.aqi || '--',
    category: item.category || '',
    primaryPollutant: item.primaryPollutant || '',
  }));
}

/**
 * 转换预警数据
 * @param raw 和风天气原始预警数据列表
 * @returns 统一格式的预警列表
 */
export function transformAlerts(raw: QWeatherAlertItem[]): QWeatherAlertItem[] {
  return (raw || []).map((item) => ({
    id: item.id || '',
    senderName: item.senderName || '',
    publishedAt: item.publishedAt || '',
    effectiveTime: item.effectiveTime || '',
    expireTime: item.expireTime || '',
    eventType: item.eventType || '',
    severity: item.severity || '',
    headline: item.headline || '',
    description: item.description || '',
    instruction: item.instruction || '',
  }));
}

/**
 * 转换生活指数
 * @param raw 和风天气原始生活指数数据列表
 * @returns 统一格式的生活指数列表
 */
export function transformIndices(raw: QWeatherIndexItem[]): QWeatherIndexItem[] {
  return (raw || []).map((item) => ({
    date: item.date || '',
    type: item.type || '',
    name: item.name || '',
    level: item.level || '',
    category: item.category || '',
    text: item.text || '',
  }));
}
