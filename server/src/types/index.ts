/**
 * @file 服务端类型定义
 * @description 后端所有核心数据结构的 TypeScript 类型
 */

// ==================== 通用类型 ====================

/** API 统一成功响应 */
export interface ApiSuccess<T> {
  success: true;
  code: 200;
  message: string;
  data: T;
}

/** API 统一失败响应 */
export interface ApiError {
  success: false;
  code: string;
  message: string;
  data: null;
}

/** API 统一响应 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** 错误码枚举 */
export const ErrorCodes = {
  CITY_NOT_FOUND: 'CITY_NOT_FOUND',
  LOCATION_RESOLVE_FAILED: 'LOCATION_RESOLVE_FAILED',
  INVALID_LOCATION_ID: 'INVALID_LOCATION_ID',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  THIRD_PARTY_API_ERROR: 'THIRD_PARTY_API_ERROR',
  THIRD_PARTY_RATE_LIMITED: 'THIRD_PARTY_RATE_LIMITED',
  CACHE_MISS: 'CACHE_MISS',
  STATS_NOT_READY: 'STATS_NOT_READY',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ==================== 城市相关 ====================

/** 和风天气城市搜索结果 */
export interface QWeatherCityResult {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
  country: string;
  lat: string;
  lon: string;
  tz: string;
  utcOffset: string;
  type: string;
}

/** 数据库 cities 表记录（字段名与数据库列名一致） */
export interface CityRecord {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
  country: string;
  lat: string;
  lon: string;
  tz: string;
  utc_offset: string;
  type: string;
  created_at: string;
  updated_at: string;
}

// ==================== 天气相关 ====================

/** 和风天气实时天气原始响应（转换后） */
export interface QWeatherNow {
  obsTime: string;
  temp: string;
  feelsLike: string;
  icon: string;
  text: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  precip: string;
  pressure: string;
  vis: string;
  cloud: string;
  dew: string;
}

/** 和风天气逐小时预报原始项 */
export interface QWeatherHourlyItem {
  fxTime: string;
  temp: string;
  icon: string;
  text: string;
  pop: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  pressure: string;
  cloud: string;
}

/** 和风天气每日预报原始项 */
export interface QWeatherDailyItem {
  fxDate: string;
  sunrise: string;
  sunset: string;
  tempMax: string;
  tempMin: string;
  iconDay: string;
  textDay: string;
  iconNight: string;
  textNight: string;
  precip: string;
  humidity: string;
  pressure: string;
  uvIndex: string;
  windDirDay: string;
  windScaleDay: string;
}

/** 和风天气分钟级降水原始项 */
export interface QWeatherMinutelyItem {
  fxTime: string;
  precip: string;
  type: string;
}

/** 和风天气空气质量原始数据 */
export interface QWeatherAirNow {
  pubTime: string;
  aqi: string;
  level: string;
  category: string;
  primary: string;
  pm2p5: string;
  pm10: string;
  no2: string;
  so2: string;
  o3: string;
  co: string;
}

/** 和风天气空气质量小时预报原始项 */
export interface QWeatherAirHourlyItem {
  fxTime: string;
  aqi: string;
  category: string;
  primaryPollutant: string;
}

/** 和风天气预警原始项（返回给前端的字段与 PRD 一致） */
export interface QWeatherAlertItem {
  id: string;
  senderName: string;
  /** 发布时间 */
  publishedAt: string;
  /** 生效时间 */
  effectiveTime: string;
  /** 过期时间 */
  expireTime: string;
  eventType: string;
  severity: string;
  headline: string;
  description: string;
  instruction: string;
}

/** 和风天气生活指数原始项 */
export interface QWeatherIndexItem {
  date: string;
  type: string;
  name: string;
  level: string;
  category: string;
  text: string;
}

// ==================== 数据库记录类型 ====================

/** 天气快照记录 */
export interface WeatherNowSnapshot {
  id: number;
  location_id: string;
  obs_time: string;
  temp: number;
  feels_like: number;
  icon: string;
  text: string;
  wind_dir: string;
  wind_scale: string;
  wind_speed: number;
  humidity: number;
  precip: number;
  pressure: number;
  visibility: number;
  cloud: number;
  created_at: string;
}

/** 空气质量快照记录 */
export interface AirNowSnapshot {
  id: number;
  location_id: string;
  pub_time: string;
  aqi: number;
  level: string;
  category: string;
  primary_pollutant: string;
  pm2p5: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  co: number;
  created_at: string;
}

/** 预警记录（created_at 由数据库自动生成） */
export interface WeatherAlert {
  id: string;
  location_id: string;
  sender_name: string;
  pub_time: string;
  start_time: string;
  end_time: string;
  event_type: string;
  severity: string;
  headline: string;
  description: string;
  instruction: string;
  created_at?: string;
}

/** 生活指数记录（created_at 由数据库自动生成） */
export interface WeatherIndex {
  id: number;
  location_id: string;
  date: string;
  type: string;
  name: string;
  level: string;
  category: string;
  text: string;
  created_at?: string;
}

/** 日统计记录 */
export interface DailyStats {
  id: number;
  location_id: string;
  stat_date: string;
  max_temp: number;
  min_temp: number;
  avg_temp: number;
  precipitation: number;
  weather_type: string;
  aqi_avg: number;
  sample_count: number;
  expected_count: number;
  is_partial: number;
  created_at: string;
}

/** 周统计记录 */
export interface WeeklyStatsRecord {
  id: number;
  location_id: string;
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
  created_at: string;
}

/** 月统计记录 */
export interface MonthlyStatsRecord {
  id: number;
  location_id: string;
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
  created_at: string;
}

// ==================== 业务聚合类型 ====================

/** 首页概览 - 天气 */
export interface OverviewWeatherNow {
  obsTime: string;
  temp: string;
  feelsLike: string;
  icon: string;
  text: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  precip: string;
  pressure: string;
  vis: string;
  cloud: string;
}

/** 首页概览 - 今日摘要 */
export interface OverviewTodaySummary {
  tempMax: string;
  tempMin: string;
  uvIndex: string;
  sunrise: string;
  sunset: string;
  statsMode: string;
}

/** 首页概览 - 空气质量 */
export interface OverviewAirNow {
  pubTime: string;
  level: string;
  aqi: string;
  category: string;
  primaryPollutant: string;
  pm2p5: string;
  pm10: string;
  no2: string;
  so2: string;
  o3: string;
  co: string;
}

/** 首页概览 - 预警摘要 */
export interface OverviewAlertSummary {
  hasAlert: boolean;
  count: number;
  highestSeverity: string | null;
}

/** 首页概览 */
export interface OverviewData {
  location: {
    id: string;
    name: string;
    adm1: string;
    adm2: string;
    lat: string;
    lon: string;
    tz: string;
  };
  weatherNow: OverviewWeatherNow;
  todaySummary: OverviewTodaySummary;
  airNow: OverviewAirNow;
  alertSummary: OverviewAlertSummary;
}

/** 首页聚合数据 */
export interface HomeData {
  overview: OverviewData;
  hourly: QWeatherHourlyItem[];
  minutely: {
    summary: string;
    list: QWeatherMinutelyItem[];
  };
  daily: QWeatherDailyItem[];
  airNow: OverviewAirNow;
  airHourly: QWeatherAirHourlyItem[];
  alerts: QWeatherAlertItem[];
  indices: QWeatherIndexItem[];
  weeklyStats: WeeklyStatsResponse;
  monthlyStats: MonthlyStatsResponse;
}

/** 周统计响应 */
export interface WeeklyStatsResponse {
  weekStart: string;
  weekEnd: string;
  avgTemp: string;
  totalPrecipitation: string;
  rainyDays: number;
  weatherTypeRatio: WeatherTypeRatioItem[];
  aqiAvg: string;
  sampleDays: number;
  expectedDays: number;
  statsStatus: string;
}

/** 月统计响应 */
export interface MonthlyStatsResponse {
  month: string;
  avgTemp: string;
  totalPrecipitation: string;
  rainyDays: number;
  weatherTypeRatio: WeatherTypeRatioItem[];
  aqiAvg: string;
  sampleDays: number;
  expectedDays: number;
  isPartialMonth: boolean;
  statsMode: string;
  statsStatus: string;
}

/** 天气类型占比 */
export interface WeatherTypeRatioItem {
  type: string;
  count: number;
  ratio: number;
}

/** 统计详情响应 */
export interface StatsDetailResponse {
  weeklyStats: WeeklyStatsResponse;
  monthlyStats: MonthlyStatsResponse;
  daily30: DailyStats[];
}
