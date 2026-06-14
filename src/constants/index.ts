/**
 * @file 应用常量定义
 * @description 项目中使用的所有常量
 */

/** 默认城市 LocationID - 上海 */
export const DEFAULT_LOCATION_ID = '101020100';

/** 默认城市名称 - 上海 */
export const DEFAULT_CITY_NAME = '上海';

/** API 基础路径 */
export const API_BASE = '/api';

/** 系统用户 ID */
export const SYSTEM_USER_ID = 'city-weather-dashboard-system-user';

/** 本地存储键名 */
export const STORAGE_KEYS = {
  /** 最近成功城市缓存 */
  RECENT_CITY: 'weather_dashboard_recent_city',
  /** 最近访问城市列表 */
  RECENT_CITIES: 'weather_dashboard_recent_cities',
  /** 默认城市设置 */
  DEFAULT_CITY: 'weather_dashboard_default_city',
} as const;

/** 缓存过期时间（毫秒） */
export const CACHE_TTL = {
  /** 实时天气：10 分钟 */
  WEATHER_NOW: 10 * 60 * 1000,
  /** 24 小时趋势：30 分钟 */
  HOURLY: 30 * 60 * 1000,
  /** 7 天预报：60 分钟 */
  DAILY: 60 * 60 * 1000,
  /** AQI：15 分钟 */
  AIR: 15 * 60 * 1000,
  /** 预警：5 分钟 */
  ALERTS: 5 * 60 * 1000,
  /** 生活指数：24 小时 */
  INDICES: 24 * 60 * 60 * 1000,
  /** 周/月统计：1 小时 */
  STATS: 60 * 60 * 1000,
} as const;

/** 预警严重程度颜色映射 */
export const SEVERITY_COLORS: Record<string, string> = {
  '红色': '#D96C3F',
  '橙色': '#E88B47',
  '黄色': '#F4B942',
  '蓝色': '#4FA3A5',
};

/** 空气质量等级颜色映射 */
export const AQI_CATEGORY_COLORS: Record<string, string> = {
  '优': '#88B04B',
  '良': '#F4B942',
  '轻度污染': '#E88B47',
  '中度污染': '#D96C3F',
  '重度污染': '#C0392B',
  '严重污染': '#8B0000',
};

/** 热门城市列表 */
export const HOT_CITIES: { id: string; name: string; adm1: string }[] = [
  { id: '101010100', name: '北京', adm1: '北京市' },
  { id: '101020100', name: '上海', adm1: '上海市' },
  { id: '101280101', name: '广州', adm1: '广东省' },
  { id: '101280601', name: '深圳', adm1: '广东省' },
  { id: '101210101', name: '杭州', adm1: '浙江省' },
  { id: '101190101', name: '南京', adm1: '江苏省' },
  { id: '101270101', name: '成都', adm1: '四川省' },
  { id: '101110101', name: '西安', adm1: '陕西省' },
  { id: '101200101', name: '武汉', adm1: '湖北省' },
  { id: '101040100', name: '重庆', adm1: '重庆市' },
];
