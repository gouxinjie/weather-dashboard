/**
 * @file 全局类型定义
 * @description 定义项目中所有核心数据结构的 TypeScript 类型
 */

// ==================== 通用类型 ====================

/** API 统一响应结构 */
export interface ApiResponse<T> {
  success: boolean;
  code: number | string;
  message: string;
  data: T;
}

/** 城市基础信息 */
export interface CityInfo {
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

// ==================== 首页概览 ====================

/** 首页概览 - 城市信息 */
export interface OverviewLocation {
  id: string;
  name: string;
  adm1: string;
  adm2: string;
  lat: string;
  lon: string;
  tz: string;
}

/** 实时天气 */
export interface WeatherNow {
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

/** 今日摘要 */
export interface TodaySummary {
  tempMax: string;
  tempMin: string;
  uvIndex: string;
  sunrise: string;
  sunset: string;
  statsMode: string;
}

/** 实时空气质量 */
export interface AirNow {
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

/** 预警摘要 */
export interface AlertSummary {
  hasAlert: boolean;
  count: number;
  highestSeverity: string | null;
}

/** 首页概览完整数据 */
export interface OverviewData {
  location: OverviewLocation;
  weatherNow: WeatherNow;
  todaySummary: TodaySummary;
  airNow: AirNow;
  alertSummary: AlertSummary;
}

// ==================== 24 小时趋势 ====================

/** 逐小时天气数据 */
export interface HourlyItem {
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

// ==================== 分钟级降水 ====================

/** 分钟级降水数据项 */
export interface MinutelyPrecipItem {
  fxTime: string;
  precip: string;
  type: string;
}

/** 分钟级降水数据 */
export interface MinutelyPrecip {
  summary: string;
  list: MinutelyPrecipItem[];
}

// ==================== 7 天预报 ====================

/** 每日预报数据 */
export interface DailyItem {
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

// ==================== 空气质量小时趋势 ====================

/** 空气质量小时趋势数据项 */
export interface AirHourlyItem {
  fxTime: string;
  aqi: string;
  category: string;
  primaryPollutant: string;
}

/** 日统计记录 */
export interface DailyStatsRecord {
  statDate: string;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  precipitation: number;
  weatherType: string;
  aqiAvg: number | null;
  sampleCount: number;
  expectedCount: number;
  isPartial: boolean;
}

// ==================== 预警 ====================

/** 预警数据 */
export interface AlertItem {
  id: string;
  senderName: string;
  publishedAt: string;
  effectiveTime: string;
  expireTime: string;
  eventType: string;
  severity: string;
  headline: string;
  description: string;
  instruction: string;
}

// ==================== 生活指数 ====================

/** 生活指数数据项 */
export interface IndexItem {
  date: string;
  type: string;
  name: string;
  level: string;
  category: string;
  text: string;
}

// ==================== 周统计 ====================

/** 天气类型占比 */
export interface WeatherTypeRatio {
  type: string;
  count: number;
  ratio: number;
}

/** 周统计数据 */
export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  avgTemp: string;
  totalPrecipitation: string;
  rainyDays: number;
  weatherTypeRatio: WeatherTypeRatio[];
  aqiAvg: string;
  sampleDays: number;
  expectedDays: number;
  statsStatus: string;
}

// ==================== 月统计 ====================

/** 月统计数据 */
export interface MonthlyStats {
  month: string;
  avgTemp: string;
  totalPrecipitation: string;
  rainyDays: number;
  weatherTypeRatio: WeatherTypeRatio[];
  aqiAvg: string;
  sampleDays: number;
  expectedDays: number;
  isPartialMonth: boolean;
  statsMode: string;
  statsStatus: string;
}

// ==================== 首页聚合接口 ====================

/** 首页聚合数据 */
export interface HomeData {
  overview: OverviewData;
  hourly: HourlyItem[];
  minutely: MinutelyPrecip;
  daily: DailyItem[];
  airNow: AirNow;
  airHourly: AirHourlyItem[];
  alerts: AlertItem[];
  indices: IndexItem[];
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
}

// ==================== 统计详情页 ====================

/** 统计详情数据 */
export interface StatsDetailData {
  weeklyStats: WeeklyStats;
  monthlyStats: MonthlyStats;
  daily30: DailyStatsRecord[];
}

// ==================== 城市选择 ====================

/** 最近访问城市 */
export interface RecentCity {
  id: string;
  name: string;
  adm1: string;
  accessedAt: string;
}

/** 热门城市 */
export interface HotCity {
  id: string;
  name: string;
  adm1: string;
}

/** 默认城市设置 */
export interface DefaultCitySettings {
  cityId: string;
  cityName: string;
}
