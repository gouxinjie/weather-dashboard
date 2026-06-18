/**
 * @component Home
 * @description 主页面 - 按设计稿重建的城市环境与天气大屏首页
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { EChartsOption } from 'echarts';
import { DashboardChart } from '../../components/commons/DashboardChart';
import { WeatherIcon } from '../../components/commons/WeatherIcon';
import { CityDrawer } from '../../components/business/CityDrawer';
import { AQI_CATEGORY_COLORS, SEVERITY_COLORS } from '../../constants';
import { useHomeData } from '../../hooks/useHomeData';
import { useLocation } from '../../hooks/useLocation';
import type {
  AirHourlyItem,
  DailyItem,
  DailyStatsRecord,
  HomeData,
  IndexItem,
  StatsDetailData,
  WeatherTypeRatio,
} from '../../types';
import { resolveWeatherScene, resolveWeatherTypeIconCode } from '../../utils/weatherIcon';
import './index.scss';

/** 指标卡片定义 */
interface SummaryMetric {
  label: string;
  value: string;
  note: string;
  accent: 'amber' | 'teal' | 'green' | 'blue';
  icon: 'weather' | 'temperature' | 'precipitation' | 'rainy-days';
}

/** 生活指数展示项 */
interface DisplayIndex {
  key: string;
  name: string;
  level: string;
  text: string;
  icon: string;
  accent: 'teal' | 'green' | 'amber' | 'orange';
}

/** 主天气卡指标定义 */
interface HeroMetric {
  key: string;
  label: string;
  value: string;
  icon: string;
  accent: 'amber' | 'teal' | 'cyan' | 'green';
}

/** 底部天气类型占比卡片定义 */
interface DisplayWeatherRatioSummary {
  title: string;
  note: string;
  items: WeatherTypeRatio[];
}

/** 底部累计降水卡片定义 */
interface DisplayPrecipitationSummary {
  title: string;
  value: string;
  note: string;
  isForecast: boolean;
}

/** 底部天气提示卡片定义 */
interface DisplayHighlightSummary {
  title: string;
  note: string;
  items: string[];
}

/**
 * 将十六进制颜色转换为 CSS 变量可使用的 RGB 字符串
 * @param hexColor 十六进制颜色值，必填，默认值无
 * @returns RGB 字符串
 */
function toCssRgbValue(hexColor: string): string {
  const normalizedColor = hexColor.replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    return '136, 176, 75';
  }

  const red = Number.parseInt(normalizedColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedColor.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

/**
 * 安全转换数字
 * @param value 原始值
 * @returns 数字结果
 */
function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 提取时间文本
 * @param value ISO 时间
 * @returns HH:mm
 */
function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 提取日期文本
 * @param value 日期文本
 * @returns MM/DD
 */
function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 获取星期文本
 * @param value 日期文本
 * @returns 星期
 */
function formatWeekLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('zh-CN', {
    weekday: 'short',
  });
}

/**
 * 按目标数量抽样数组
 * @param items 原数组
 * @param count 目标数量
 * @returns 抽样结果
 */
function sampleItems<T>(items: T[], count: number): T[] {
  if (items.length <= count) {
    return items;
  }

  const step = items.length / count;
  const result: T[] = [];

  for (let index = 0; index < count; index += 1) {
    result.push(items[Math.floor(index * step)]);
  }

  return result;
}

/**
 * 判断统计文本是否有效
 * @param value 统计值
 * @returns 是否有效
 */
function hasMetricValue(value: string): boolean {
  return value.trim() !== '' && value.trim() !== '--';
}

/**
 * 计算每日平均气温
 * @param item 每日预报
 * @returns 平均气温
 */
function getDailyAverageTemp(item: DailyItem): number {
  return (toNumber(item.tempMax) + toNumber(item.tempMin)) / 2;
}

/**
 * 判断是否为雨天
 * @param item 每日预报
 * @returns 是否雨天
 */
function isRainyDay(item: DailyItem): boolean {
  return toNumber(item.precip) > 0.1 || /雨|雪/.test(item.textDay) || /雨|雪/.test(item.textNight);
}

/**
 * 格式化数值展示
 * @param value 数值
 * @param digits 小数位
 * @returns 文本
 */
function formatMetricNumber(value: number, digits: number = 1): string {
  if (!Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(digits);
}

/**
 * 获取今日天气描述
 * @param dailyToday 今日预报
 * @param weatherText 实时天气
 * @returns 天气描述
 */
function getTodayWeatherText(dailyToday: DailyItem | undefined, weatherText: string): string {
  if (!dailyToday) {
    return weatherText;
  }

  if (dailyToday.textDay && dailyToday.textNight && dailyToday.textDay !== dailyToday.textNight) {
    return `${dailyToday.textDay}转${dailyToday.textNight}`;
  }

  return dailyToday.textDay || dailyToday.textNight || weatherText;
}

/**
 * 基于预报生成天气占比
 * @param daily 预报列表
 * @returns 占比
 */
function buildWeatherRatiosFromDaily(daily: DailyItem[]): WeatherTypeRatio[] {
  if (daily.length === 0) {
    return [];
  }

  const counter = new Map<string, number>();

  daily.forEach((item) => {
    const type = getDailyTypeLabel(item);
    counter.set(type, (counter.get(type) || 0) + 1);
  });

  return Array.from(counter.entries())
    .map(([type, count]) => ({
      type,
      count,
      ratio: count / daily.length,
    }))
    .sort((prev, current) => current.ratio - prev.ratio);
}

/**
 * 获取首页展示用天气占比
 * @param homeData 首页数据
 * @returns 占比列表
 */
function getDisplayWeatherRatioSummary(homeData: HomeData): DisplayWeatherRatioSummary {
  if (homeData.monthlyStats.weatherTypeRatio.length > 0) {
    return {
      title: '近 30 天天气类型占比',
      note:
        homeData.monthlyStats.sampleDays > 0
          ? `统计样本 ${homeData.monthlyStats.sampleDays} 天`
          : '本地统计样本',
      items: homeData.monthlyStats.weatherTypeRatio,
    };
  }

  return {
    title: '未来 7 天天气类型占比',
    note: '预报分布参考',
    items: buildWeatherRatiosFromDaily(homeData.daily),
  };
}

/**
 * 获取首页展示用累计降水
 * @param homeData 首页数据
 * @returns 展示值与说明
 */
function getDisplayMonthlyPrecipitation(homeData: HomeData): DisplayPrecipitationSummary {
  if (homeData.monthlyStats.sampleDays > 0 && hasMetricValue(homeData.monthlyStats.totalPrecipitation)) {
    return {
      title: '近 30 天累计降水',
      value: homeData.monthlyStats.totalPrecipitation,
      note: `统计样本 ${homeData.monthlyStats.sampleDays} 天`,
      isForecast: false,
    };
  }

  const forecastSum = homeData.daily.reduce((sum, item) => sum + toNumber(item.precip), 0);

  return {
    title: '未来 7 天累计降水',
    value: formatMetricNumber(forecastSum),
    note: '7 天预报累计',
    isForecast: true,
  };
}

/**
 * 构建首页累计降水趋势文案
 * @param statsDetail 统计详情
 * @param dailyForecast 7天预报
 * @returns 对比文案
 */
function buildDisplayPrecipitationDelta(
  statsDetail: StatsDetailData | null,
  dailyForecast: DailyItem[]
): string {
  if (statsDetail && statsDetail.daily30.length >= 2) {
    return buildPrecipitationDelta(statsDetail);
  }

  if (dailyForecast.length < 2) {
    return '预报样本不足';
  }

  const splitIndex = Math.max(1, Math.floor(dailyForecast.length / 2));
  const firstHalf = dailyForecast
    .slice(0, splitIndex)
    .reduce((sum, item) => sum + toNumber(item.precip), 0);
  const secondHalf = dailyForecast
    .slice(splitIndex)
    .reduce((sum, item) => sum + toNumber(item.precip), 0);

  if (firstHalf === 0 && secondHalf === 0) {
    return '降水平稳';
  }

  if (firstHalf === 0) {
    return '↑ 预报转雨';
  }

  if (secondHalf === 0) {
    return '↓ 后段转晴';
  }

  const delta = ((secondHalf - firstHalf) / firstHalf) * 100;

  if (Math.abs(delta) < 10) {
    return '降水平稳';
  }

  return `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(0)}%`;
}

/**
 * 生成农历文本
 * @param date 日期
 * @param timeZone 时区
 * @returns 农历日期
 */
function formatLunarDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      timeZone,
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return '农历日期未知';
  }
}

/**
 * 生成顶部时间信息
 * @param date 当前时间
 * @param timeZone 时区
 * @returns 时间和辅助文本
 */
function buildTimeMeta(
  date: Date,
  timeZone: string
): { dateText: string; timeText: string; weekText: string; lunarText: string } {
  const datePart = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  const week = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    weekday: 'long',
  }).format(date);

  return {
    dateText: datePart,
    timeText: timePart,
    weekText: week,
    lunarText: formatLunarDate(date, timeZone),
  };
}

/**
 * 生成天气摘要指标
 * @param homeData 首页数据
 * @returns 左侧摘要列表
 */
function buildSummaryMetrics(homeData: HomeData): SummaryMetric[] {
  const weeklyForecast = homeData.daily.slice(0, 7);
  const todayForecast = weeklyForecast[0];
  const monthlyForecast = homeData.daily.filter((item) =>
    item.fxDate.startsWith(homeData.monthlyStats.month)
  );
  const monthlySample = monthlyForecast.length > 0 ? monthlyForecast : weeklyForecast;
  const displayMonthlyPrecipitation = getDisplayMonthlyPrecipitation(homeData);
  const weeklyRainyDays =
    homeData.weeklyStats.sampleDays > 0
      ? homeData.weeklyStats.rainyDays
      : weeklyForecast.filter((item) => isRainyDay(item)).length;
  const weeklyAvgTemp =
    homeData.weeklyStats.sampleDays > 0 && hasMetricValue(homeData.weeklyStats.avgTemp)
      ? `${homeData.weeklyStats.avgTemp}°C`
      : weeklyForecast.length > 0
        ? `${formatMetricNumber(
            weeklyForecast.reduce((sum, item) => sum + getDailyAverageTemp(item), 0) /
              weeklyForecast.length
          )}°C`
        : '--°C';
  const weeklyTotalPrecipitation =
    homeData.weeklyStats.sampleDays > 0 && hasMetricValue(homeData.weeklyStats.totalPrecipitation)
      ? `${homeData.weeklyStats.totalPrecipitation} mm`
      : `${formatMetricNumber(
          weeklyForecast.reduce((sum, item) => sum + toNumber(item.precip), 0)
        )} mm`;
  const monthlyAvgTemp =
    homeData.monthlyStats.sampleDays > 0 && hasMetricValue(homeData.monthlyStats.avgTemp)
      ? `${homeData.monthlyStats.avgTemp}°C`
      : monthlySample.length > 0
        ? `${formatMetricNumber(
            monthlySample.reduce((sum, item) => sum + getDailyAverageTemp(item), 0) /
              monthlySample.length
          )}°C`
        : '--°C';
  const todayValue = todayForecast
    ? `${todayForecast.tempMin}°/${todayForecast.tempMax}°`
    : `${homeData.overview.todaySummary.tempMin}°/${homeData.overview.todaySummary.tempMax}°`;
  const monthlyTempLabel = homeData.monthlyStats.sampleDays > 0 ? '本月平均气温' : '7天平均气温';
  const monthlyPrecipitationLabel = displayMonthlyPrecipitation.isForecast
    ? '7天累计降水'
    : '本月累计降水';
  const weeklyTempNote =
    homeData.weeklyStats.sampleDays > 0 ? `${homeData.weeklyStats.weekStart} 起` : '7天预报';
  const monthlyTempNote =
    homeData.monthlyStats.sampleDays > 0 ? '截至最新采样日' : '月内预报';

  return [
    {
      label: '今日天气',
      value: todayValue,
      note: getTodayWeatherText(todayForecast, homeData.overview.weatherNow.text) || '暂无天气描述',
      accent: 'amber',
      icon: 'weather',
    },
    {
      label: '本周平均气温',
      value: weeklyAvgTemp,
      note: weeklyTempNote,
      accent: 'teal',
      icon: 'temperature',
    },
    {
      label: '本周总降水',
      value: weeklyTotalPrecipitation,
      note: `雨天 ${weeklyRainyDays} 天`,
      accent: 'blue',
      icon: 'precipitation',
    },
    {
      label: '本周雨天数',
      value: `${weeklyRainyDays} 天`,
      note:
        homeData.weeklyStats.sampleDays > 0
          ? `样本 ${homeData.weeklyStats.sampleDays}/${homeData.weeklyStats.expectedDays}`
          : '7天预报',
      accent: 'green',
      icon: 'rainy-days',
    },
    {
      label: monthlyTempLabel,
      value: monthlyAvgTemp,
      note: monthlyTempNote,
      accent: 'amber',
      icon: 'temperature',
    },
    {
      label: monthlyPrecipitationLabel,
      value: `${displayMonthlyPrecipitation.value} mm`,
      note: displayMonthlyPrecipitation.note,
      accent: 'blue',
      icon: 'precipitation',
    },
  ];
}

/**
 * 选择展示的生活指数
 * @param indices 指数列表
 * @returns 展示列表
 */
function pickLifeIndices(indices: IndexItem[]): DisplayIndex[] {
  const presets: Array<{
    key: string;
    title: string;
    matcher: RegExp;
    icon: string;
    accent: DisplayIndex['accent'];
  }> = [
    { key: 'dress', title: '穿衣指数', matcher: /穿衣/, icon: '🧥', accent: 'teal' },
    { key: 'car', title: '洗车指数', matcher: /洗车/, icon: '🚗', accent: 'green' },
    { key: 'sport', title: '运动指数', matcher: /运动/, icon: '🏃', accent: 'green' },
    { key: 'cold', title: '感冒指数', matcher: /感冒/, icon: '💊', accent: 'orange' },
    { key: 'uv', title: '紫外线指数', matcher: /紫外线/, icon: '☀', accent: 'amber' },
    { key: 'travel', title: '出行建议', matcher: /旅游|出行/, icon: '✈', accent: 'orange' },
  ];

  const selected = presets.map((preset) => {
    const matched = indices.find((item) => preset.matcher.test(item.name));

    return {
      key: preset.key,
      name: matched?.name || preset.title,
      level: matched?.category || matched?.level || '暂无',
      text: buildLifeIndexBrief(
        preset.key,
        matched?.category || matched?.level || '暂无',
        matched?.text || '当前暂无该指数数据',
      ),
      icon: preset.icon,
      accent: preset.accent,
    };
  });

  return selected;
}

/**
 * 生成生活指数卡片的简短说明
 * @param key 指数标识
 * @param level 指数等级
 * @param sourceText 原始描述
 * @returns 简化后的展示文案
 */
function buildLifeIndexBrief(key: string, level: string, sourceText: string): string {
  const normalizedLevel = level.trim();
  const fallbackText = summarizeLifeIndexText(sourceText);

  if (key === 'dress') {
    if (/炎热|热|较热/.test(normalizedLevel)) {
      return '天气偏热，建议轻薄夏装';
    }

    if (/冷|凉|较冷/.test(normalizedLevel)) {
      return '早晚偏凉，建议添薄外套';
    }

    if (/舒适|温暖|较舒适/.test(normalizedLevel)) {
      return '体感较舒适，按日常着装即可';
    }

    return fallbackText;
  }

  if (key === 'car') {
    if (/较不宜|不宜/.test(normalizedLevel)) {
      return '近期有雨，建议暂缓洗车';
    }

    if (/适宜|宜/.test(normalizedLevel) && !/不宜/.test(normalizedLevel)) {
      return '天气较稳，适合洗车养护';
    }

    return fallbackText;
  }

  if (key === 'sport') {
    if (/较不宜|不宜/.test(normalizedLevel)) {
      return '天气偏热，建议减少户外运动';
    }

    if (/适宜|较适宜|宜/.test(normalizedLevel) && !/不宜/.test(normalizedLevel)) {
      return '体感尚可，适合适度活动';
    }

    return fallbackText;
  }

  if (key === 'cold') {
    if (/少发|低/.test(normalizedLevel)) {
      return '感冒风险较低，注意空调温差';
    }

    if (/较易发|易发|高/.test(normalizedLevel)) {
      return '早晚注意保暖，谨防受凉感冒';
    }

    return fallbackText;
  }

  if (key === 'uv') {
    if (/很强|强/.test(normalizedLevel)) {
      return '紫外线较强，外出注意防晒';
    }

    if (/弱|较弱/.test(normalizedLevel)) {
      return '紫外线偏弱，日常防晒即可';
    }

    if (/中等/.test(normalizedLevel)) {
      return '紫外线中等，外出做好基础防晒';
    }

    return fallbackText;
  }

  if (key === 'travel') {
    if (/不宜|较不宜/.test(normalizedLevel)) {
      return '天气多变，出行前留意预报';
    }

    if (/适宜|较适宜|宜/.test(normalizedLevel) && !/不宜/.test(normalizedLevel)) {
      return '天气较稳，适合安排出行';
    }

    return fallbackText;
  }

  return fallbackText;
}

/**
 * 提取生活指数原始描述的首句摘要
 * @param sourceText 原始描述
 * @returns 简化后的摘要文案
 */
function summarizeLifeIndexText(sourceText: string): string {
  const firstSegment = sourceText
    .split(/[。；，,.!！?？]/)
    .map((item) => item.trim())
    .find((item) => item.length > 0);

  if (!firstSegment) {
    return '暂无指数说明';
  }

  return firstSegment.length > 16 ? `${firstSegment.slice(0, 16)}...` : firstSegment;
}

/**
 * 构建主天气卡提示语
 * @param homeData 首页数据
 * @returns 提示语
 */
function buildHeroAdvice(homeData: HomeData): string {
  const weatherText = homeData.overview.weatherNow.text;

  if (/雨/.test(weatherText)) {
    return '空气清新，雨天路滑，注意安全出行';
  }

  if (/晴/.test(weatherText)) {
    return '天空通透，紫外线偏强，出行注意防晒';
  }

  if (/雾|霾/.test(weatherText)) {
    return '能见度一般，出行请留意道路与空气变化';
  }

  return '天气平稳，体感舒适，适合安排日常出行';
}

/**
 * 构建主天气卡底部指标
 * @param homeData 首页数据
 * @returns 指标列表
 */
function buildHeroMetrics(homeData: HomeData): HeroMetric[] {
  return [
    {
      key: 'temp-max',
      label: '最高温度',
      value: `${homeData.overview.todaySummary.tempMax}°C`,
      icon: '◔',
      accent: 'amber',
    },
    {
      key: 'temp-min',
      label: '最低温度',
      value: `${homeData.overview.todaySummary.tempMin}°C`,
      icon: '◕',
      accent: 'cyan',
    },
    {
      key: 'wind',
      label: '风向风力',
      value: `${homeData.overview.weatherNow.windDir} ${homeData.overview.weatherNow.windScale}级`,
      icon: '↗',
      accent: 'teal',
    },
    {
      key: 'humidity',
      label: '湿度',
      value: `${homeData.overview.weatherNow.humidity}%`,
      icon: '◍',
      accent: 'teal',
    },
    {
      key: 'visibility',
      label: '能见度',
      value: `${homeData.overview.weatherNow.vis} km`,
      icon: '◌',
      accent: 'green',
    },
    {
      key: 'pressure',
      label: '气压',
      value: `${homeData.overview.weatherNow.pressure} hPa`,
      icon: '○',
      accent: 'green',
    },
    {
      key: 'precipitation',
      label: '当前降水量',
      value: `${homeData.overview.weatherNow.precip} mm`,
      icon: '💧',
      accent: 'cyan',
    },
    {
      key: 'uv',
      label: '紫外线强度',
      value: `${homeData.overview.todaySummary.uvIndex} 级`,
      icon: '☼',
      accent: 'amber',
    },
  ];
}

/**
 * 转换近 7 天趋势数据
 * @param statsDetail 统计详情
 * @param dailyForecast 7 天天气预报
 * @returns 近 7 天趋势
 */
function buildRecentSevenSeries(
  statsDetail: StatsDetailData | null,
  dailyForecast: DailyItem[]
): Array<{
  dateLabel: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
}> {
  if (statsDetail && statsDetail.daily30.length > 0) {
    return statsDetail.daily30.slice(-7).map((item) => ({
      dateLabel: item.statDate.slice(5),
      maxTemp: item.maxTemp,
      minTemp: item.minTemp,
      precipitation: item.precipitation,
    }));
  }

  return dailyForecast.slice(0, 7).map((item) => ({
    dateLabel: item.fxDate.slice(5),
    maxTemp: toNumber(item.tempMax),
    minTemp: toNumber(item.tempMin),
    precipitation: toNumber(item.precip),
  }));
}

/**
 * 转换极端天气提示
 * @param statsDetail 统计详情
 * @param dailyForecast 7 天天气预报
 * @returns 提示列表
 */
function buildMonthlyHighlights(
  statsDetail: StatsDetailData | null,
  dailyForecast: DailyItem[]
): DisplayHighlightSummary {
  const source = statsDetail?.daily30 ?? [];

  if (source.length > 0) {
    const maxTempDay = source.reduce((prev, current) =>
      current.maxTemp > prev.maxTemp ? current : prev
    );
    const minTempDay = source.reduce((prev, current) =>
      current.minTemp < prev.minTemp ? current : prev
    );
    const maxPrecipDay = source.reduce((prev, current) =>
      current.precipitation > prev.precipitation ? current : prev
    );

    return {
      title: '本月极端天气提示',
      note: `样本期 ${source[0].statDate} 至 ${source[source.length - 1].statDate}`,
      items: [
        `${maxTempDay.statDate.slice(5)} 最高气温 ${maxTempDay.maxTemp.toFixed(1)}°C`,
        `${minTempDay.statDate.slice(5)} 最低气温 ${minTempDay.minTemp.toFixed(1)}°C`,
        `${maxPrecipDay.statDate.slice(5)} 最大日降水 ${maxPrecipDay.precipitation.toFixed(1)}mm`,
        `本月样本共 ${source.length} 天`,
      ],
    };
  }

  const hotDay = dailyForecast.reduce((prev, current) =>
    toNumber(current.tempMax) > toNumber(prev.tempMax) ? current : prev
  );
  const rainDay = dailyForecast.reduce((prev, current) =>
    toNumber(current.precip) > toNumber(prev.precip) ? current : prev
  );

  return {
    title: '未来 7 天天气提示',
    note: '近 30 天实测样本不足，以下内容基于当前预报',
    items: [
      `${formatShortDate(hotDay.fxDate)} 预报最高气温 ${hotDay.tempMax}°C`,
      `${formatShortDate(rainDay.fxDate)} 预报降水 ${rainDay.precip}mm`,
      '近 30 天实测样本不足，以下提示以当前预报为参考',
    ],
  };
}

/**
 * 转换 30 天累计降水比较值
 * @param statsDetail 统计详情
 * @returns 对比文本
 */
function buildPrecipitationDelta(statsDetail: StatsDetailData | null): string {
  if (!statsDetail || statsDetail.daily30.length < 2) {
    return '样本不足';
  }

  const splitIndex = Math.floor(statsDetail.daily30.length / 2);
  const firstHalf = statsDetail.daily30
    .slice(0, splitIndex)
    .reduce((sum, item) => sum + item.precipitation, 0);
  const secondHalf = statsDetail.daily30
    .slice(splitIndex)
    .reduce((sum, item) => sum + item.precipitation, 0);

  if (firstHalf === 0) {
    return secondHalf > 0 ? '较前段上升' : '与前段持平';
  }

  const delta = ((secondHalf - firstHalf) / firstHalf) * 100;
  const prefix = delta >= 0 ? '↑' : '↓';
  return `${prefix} ${Math.abs(delta).toFixed(0)}%`;
}

/**
 * 转换日统计记录为前端视图字段
 * @param item 日统计记录
 * @returns 视图文本
 */
function getDailyTypeLabel(item: DailyItem | DailyStatsRecord): string {
  if ('textDay' in item) {
    return item.textDay || item.textNight || '--';
  }

  return item.weatherType || '--';
}

/**
 * 构建 24 小时天气趋势图配置
 * @param hourlyData 逐小时数据
 * @returns ECharts 配置
 */
function buildHourlyChartOption(hourlyData: HomeData['hourly']): EChartsOption {
  const sampled = sampleItems(hourlyData, 12);

  return {
    animationDuration: 500,
    grid: {
      top: 18,
      left: 36,
      right: 30,
      bottom: 28,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 20, 30, 0.96)',
      borderColor: 'rgba(96, 151, 171, 0.25)',
      textStyle: {
        color: '#dff4ff',
        fontSize: 12,
      },
    },
    xAxis: {
      type: 'category',
      data: sampled.map((item) => formatTime(item.fxTime)),
      axisLine: {
        lineStyle: {
          color: 'rgba(109, 154, 174, 0.28)',
        },
      },
      axisLabel: {
        color: '#82a8b9',
        fontSize: 11,
        margin: 10,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: [
      {
        type: 'value',
        min: Math.max(0, Math.min(...sampled.map((item) => toNumber(item.temp))) - 4),
        max: Math.max(...sampled.map((item) => toNumber(item.temp))) + 6,
        splitNumber: 4,
        axisLabel: {
          color: '#65889a',
          fontSize: 10,
        },
        axisLine: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(90, 128, 146, 0.14)',
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        max: 100,
        splitLine: {
          show: false,
        },
        axisLabel: {
          color: '#65889a',
          fontSize: 10,
          formatter: '{value}%',
        },
      },
    ],
    series: [
      {
        name: '降水概率',
        type: 'bar',
        yAxisIndex: 1,
        data: sampled.map((item) => toNumber(item.pop)),
        barWidth: 12,
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#5fd2f0' },
              { offset: 1, color: 'rgba(95, 210, 240, 0.18)' },
            ],
          },
        },
      },
      {
        name: '温度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: sampled.map((item) => toNumber(item.temp)),
        lineStyle: {
          color: '#f4bb47',
          width: 2,
        },
        itemStyle: {
          color: '#ffbe3a',
          borderColor: '#f9ead2',
          borderWidth: 1.5,
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}°',
          color: '#f3dcc0',
          fontSize: 11,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(244, 187, 71, 0.16)' },
              { offset: 1, color: 'rgba(244, 187, 71, 0)' },
            ],
          },
        },
      },
    ],
  };
}

/**
 * 构建空气质量趋势图配置
 * @param airHourly 空气质量趋势
 * @returns ECharts 配置
 */
function buildAirChartOption(airHourly: AirHourlyItem[]): EChartsOption {
  const sampled = sampleItems(airHourly, 8);

  return {
    animationDuration: 400,
    grid: {
      top: 16,
      left: 32,
      right: 10,
      bottom: 18,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 20, 30, 0.96)',
      borderColor: 'rgba(96, 151, 171, 0.25)',
      textStyle: {
        color: '#dff4ff',
        fontSize: 12,
      },
    },
    xAxis: {
      type: 'category',
      data: sampled.map((item) => formatTime(item.fxTime)),
      axisLine: {
        lineStyle: {
          color: 'rgba(109, 154, 174, 0.24)',
        },
      },
      axisLabel: {
        color: '#82a8b9',
        fontSize: 10,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        color: '#65889a',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(90, 128, 146, 0.12)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: sampled.map((item) => toNumber(item.aqi)),
        lineStyle: {
          color: '#86ce56',
          width: 2,
        },
        itemStyle: {
          color: '#98da67',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(120, 199, 72, 0.18)' },
              { offset: 1, color: 'rgba(120, 199, 72, 0)' },
            ],
          },
        },
      },
    ],
  };
}

/**
 * 构建温度趋势图配置
 * @param series 近 7 天数据
 * @returns ECharts 配置
 */
function buildTemperatureTrendOption(
  series: ReturnType<typeof buildRecentSevenSeries>
): EChartsOption {
  return {
    animationDuration: 400,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 20, 30, 0.96)',
      borderColor: 'rgba(96, 151, 171, 0.25)',
      textStyle: {
        color: '#dff4ff',
      },
    },
    legend: {
      top: 0,
      right: 6,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: {
        color: '#7ea3b5',
        fontSize: 10,
      },
      data: ['最高温度', '最低温度'],
    },
    grid: {
      top: 30,
      left: 28,
      right: 14,
      bottom: 18,
    },
    xAxis: {
      type: 'category',
      data: series.map((item) => item.dateLabel),
      axisLine: {
        lineStyle: {
          color: 'rgba(109, 154, 174, 0.24)',
        },
      },
      axisLabel: {
        color: '#82a8b9',
        fontSize: 10,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#65889a',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(90, 128, 146, 0.12)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '最高温度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: series.map((item) => item.maxTemp),
        lineStyle: {
          color: '#ffb137',
          width: 2,
        },
        itemStyle: {
          color: '#ffb137',
        },
      },
      {
        name: '最低温度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: series.map((item) => item.minTemp),
        lineStyle: {
          color: '#7dd4d5',
          width: 2,
        },
        itemStyle: {
          color: '#7dd4d5',
        },
      },
    ],
  };
}

/**
 * 构建降水趋势图配置
 * @param series 近 7 天数据
 * @returns ECharts 配置
 */
function buildPrecipitationTrendOption(
  series: ReturnType<typeof buildRecentSevenSeries>
): EChartsOption {
  return {
    animationDuration: 400,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 20, 30, 0.96)',
      borderColor: 'rgba(96, 151, 171, 0.25)',
      textStyle: {
        color: '#dff4ff',
      },
    },
    grid: {
      top: 18,
      left: 28,
      right: 14,
      bottom: 18,
    },
    xAxis: {
      type: 'category',
      data: series.map((item) => item.dateLabel),
      axisLine: {
        lineStyle: {
          color: 'rgba(109, 154, 174, 0.24)',
        },
      },
      axisLabel: {
        color: '#82a8b9',
        fontSize: 10,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#65889a',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(90, 128, 146, 0.12)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        type: 'bar',
        barWidth: 18,
        data: series.map((item) => item.precipitation),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#6dd1ef' },
              { offset: 1, color: 'rgba(109, 209, 239, 0.24)' },
            ],
          },
        },
      },
    ],
  };
}

/**
 * 构建天气类型占比图配置
 * @param ratios 天气占比
 * @returns ECharts 配置
 */
function buildWeatherRatioOption(ratios: WeatherTypeRatio[]): EChartsOption {
  const colors = ['#f2b338', '#72cbd2', '#8e9ba3', '#4f9bc7', '#7acb88'];

  return {
    animationDuration: 500,
    color: colors,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(9, 20, 30, 0.96)',
      borderColor: 'rgba(96, 151, 171, 0.25)',
      textStyle: {
        color: '#dff4ff',
      },
      formatter: '{b}: {d}%',
    },
    series: [
      {
        type: 'pie',
        radius: ['54%', '76%'],
        center: ['46%', '54%'],
        data: ratios.map((item) => ({
          name: item.type,
          value: item.count,
        })),
        label: {
          show: false,
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#0a1822',
        },
      },
    ],
    graphic: [
      {
        type: 'group',
        left: '35%',
        top: '39%',
        children: [
          {
            type: 'text',
            style: {
              text: '☁',
              fill: '#dfeff7',
              font: '28px "Segoe UI Symbol"',
            },
          },
        ],
      },
    ],
  };
}

/**
 * 摘要数值行
 * @param props 属性
 * @returns 节点
 */
function getSummaryMetricIcon(icon: SummaryMetric['icon']): string {
  switch (icon) {
    case 'weather':
      return '☼';
    case 'temperature':
      return '℃';
    case 'precipitation':
      return '☂';
    case 'rainy-days':
      return '☔';
    default:
      return '•';
  }
}

/**
 * 摘要数值行
 * @param props 属性
 * @returns 节点
 */
function SummaryRow({ metric }: { metric: SummaryMetric }): JSX.Element {
  return (
    <div className={`weather-home__summary-row weather-home__summary-row--${metric.accent}`}>
      <span
        aria-hidden="true"
        className={`weather-home__summary-icon weather-home__summary-icon--${metric.icon}`}
      >
        {getSummaryMetricIcon(metric.icon)}
      </span>
      <div className="weather-home__summary-copy">
        <div className="weather-home__summary-title-line">
          <span className="weather-home__summary-label">{metric.label}</span>
          <span className="weather-home__summary-note">{metric.note}</span>
        </div>
      </div>
      <strong className="weather-home__summary-value">{metric.value}</strong>
    </div>
  );
}

/**
 * 首页组件
 * @returns 首页节点
 */
export default function Home(): JSX.Element {
  useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { homeData, statsDetail, loading, error, refetch } = useHomeData();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const viewModel = useMemo(() => {
    if (!homeData) {
      return null;
    }

    const timeZone = homeData.overview.location.tz || 'Asia/Shanghai';
    const timeMeta = buildTimeMeta(now, timeZone);
    const weatherScene = resolveWeatherScene(homeData.overview.weatherNow.icon);
    const summaryMetrics = buildSummaryMetrics(homeData);
    const lifeIndices = pickLifeIndices(homeData.indices);
    const weatherRatioSummary = getDisplayWeatherRatioSummary(homeData);
    const weatherRatiosAll = weatherRatioSummary.items;
    const weatherRatios = weatherRatiosAll.slice(0, 4);
    const recentSevenSeries = buildRecentSevenSeries(statsDetail, homeData.daily);
    const highlightSummary = buildMonthlyHighlights(statsDetail, homeData.daily);
    const hourlySample = sampleItems(homeData.hourly, 12);
    const displayMonthlyPrecipitation = getDisplayMonthlyPrecipitation(homeData);
    const heroMetrics = buildHeroMetrics(homeData);
    const heroAdvice = buildHeroAdvice(homeData);

    return {
      timeMeta,
      weatherScene,
      summaryMetrics,
      heroMetrics,
      heroAdvice,
      lifeIndices,
      weatherRatioSummary,
      weatherRatios,
      weatherRatiosAll,
      recentSevenSeries,
      highlightSummary,
      monthlyHighlights: highlightSummary.items,
      hourlySample,
      displayMonthlyPrecipitation,
      precipitationDelta: buildDisplayPrecipitationDelta(statsDetail, homeData.daily),
    };
  }, [homeData, now, statsDetail]);

  if (error) {
    return (
      <div className="weather-home weather-home--state">
        <div className="weather-home__state-card weather-home__state-card--error">
          <p className="weather-home__state-title">首页数据加载失败</p>
          <span className="weather-home__state-note">{error}</span>
          <button className="weather-home__state-action" onClick={refetch} type="button">
            重新获取
          </button>
        </div>
      </div>
    );
  }

  if (loading || !viewModel || !homeData) {
    return (
      <div className="weather-home weather-home--state">
        <div className="weather-home__state-card">
          <div className="weather-home__state-spinner" />
          <p className="weather-home__state-title">正在加载城市天气大屏</p>
          <span className="weather-home__state-note">定位、天气与环境数据正在汇总</span>
        </div>
      </div>
    );
  }

  const primaryAlert = homeData.alerts[0] || null;
  const aqiColor = AQI_CATEGORY_COLORS[homeData.airNow.category] || '#88B04B';
  const airLevelLabel = homeData.airNow.category || homeData.airNow.level || '未知';
  const aqiBadgeStyle = {
    '--weather-home-headline-badge-rgb': toCssRgbValue(aqiColor),
  } as CSSProperties;
  const hasAlert = homeData.overview.alertSummary.hasAlert;
  const alertColor = homeData.overview.alertSummary.highestSeverity
    ? SEVERITY_COLORS[homeData.overview.alertSummary.highestSeverity] || '#8fd15b'
    : '#8fd15b';
  const alertIconStyle = {
    '--weather-home-headline-alert-rgb': toCssRgbValue(alertColor),
  } as CSSProperties;

  return (
    <div className="weather-home">
      <div className="weather-home__shell">
        <header className="weather-home__topbar">
          <div className="weather-home__brand">
            <h1 className="weather-home__brand-title">城市环境与天气大屏</h1>
            <span className="weather-home__brand-subtitle">STORM LEDGER</span>
          </div>

          <div className="weather-home__headline-card weather-home__headline-card--city">
            <span className="weather-home__headline-pin" aria-hidden="true" />
            <div className="weather-home__headline-copy">
              <strong>{homeData.overview.location.name}市</strong>
              <span>{homeData.overview.location.adm1} {homeData.overview.location.adm2}</span>
            </div>
          </div>

          <div className="weather-home__headline-card weather-home__headline-card--time">
            <div className="weather-home__headline-time-block">
              <div className="weather-home__headline-time-row">
                <strong>
                  {viewModel.timeMeta.dateText} {viewModel.timeMeta.timeText}
                </strong>
              </div>
              <div className="weather-home__headline-time-meta">
                <span>{viewModel.timeMeta.weekText}</span>
                <em>{viewModel.timeMeta.lunarText}</em>
              </div>
            </div>
          </div>

          <div className="weather-home__headline-card weather-home__headline-card--updated">
            <div className="weather-home__headline-stack">
              <span>数据更新时间</span>
              <strong>{formatTime(homeData.overview.weatherNow.obsTime)}</strong>
            </div>
          </div>

          <div className="weather-home__headline-card weather-home__headline-card--weather">
            <WeatherIcon
              code={homeData.overview.weatherNow.icon}
              className="weather-home__headline-weather-icon"
              label={homeData.overview.weatherNow.text}
            />
            <div className="weather-home__headline-stack">
              <span>天气摘要</span>
              <strong>{homeData.overview.weatherNow.text}</strong>
            </div>
          </div>

          <div className="weather-home__headline-card weather-home__headline-card--aqi">
            <div className="weather-home__headline-stack">
              <span>AQI</span>
              <div className="weather-home__headline-value-line">
                <strong style={{ color: aqiColor }}>{homeData.airNow.aqi}</strong>
                <em
                  className="weather-home__headline-badge"
                  style={aqiBadgeStyle}
                >
                  {homeData.airNow.category}
                </em>
              </div>
            </div>
          </div>

          <div className="weather-home__headline-card weather-home__headline-card--alert">
            <div className="weather-home__headline-stack weather-home__headline-stack--alert">
              <span>预警状态</span>
              <div
                className={`weather-home__headline-status weather-home__headline-status--${hasAlert ? 'warning' : 'safe'}`}
                style={alertIconStyle}
              >
                <span className="weather-home__headline-status-icon" aria-hidden="true">
                  {hasAlert ? (
                    <svg viewBox="0 0 16 18" focusable="false">
                      <path
                        d="M8 1.5 13 3.2v4.6c0 3.1-1.85 5.93-5 7.8-3.15-1.87-5-4.7-5-7.8V3.2L8 1.5Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 5.1v4.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="12.25" r="1" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 18" focusable="false">
                      <path
                        d="M8 1.5 13 3.2v4.6c0 3.1-1.85 5.93-5 7.8-3.15-1.87-5-4.7-5-7.8V3.2L8 1.5Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m5.2 8.9 1.9 1.9 3.7-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <strong>
                  {hasAlert
                    ? homeData.overview.alertSummary.highestSeverity
                      ? `${homeData.overview.alertSummary.highestSeverity}预警`
                      : '有预警'
                    : '无预警'}
                </strong>
              </div>
            </div>
          </div>

          <button
            className="weather-home__city-action"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <span>城市选择</span>
            <strong aria-hidden="true" />
          </button>
        </header>

        <main className="weather-home__layout">
          <aside className="weather-home__sidebar weather-home__sidebar--left">
            <section className="weather-home__panel weather-home__panel--summary">
              <div className="weather-home__panel-head">
                <h2>天气统计摘要</h2>
              </div>

              <div className="weather-home__summary-list">
                {viewModel.summaryMetrics.map((metric) => (
                  <SummaryRow key={metric.label} metric={metric} />
                ))}
              </div>

              <div className="weather-home__ratio-group">
                <div className="weather-home__ratio-caption">本月天气类型占比</div>
                <div className="weather-home__ratio-strip">
                  {viewModel.weatherRatios.map((item) => (
                    <div className="weather-home__ratio-item" key={item.type}>
                      <WeatherIcon
                        code={resolveWeatherTypeIconCode(item.type)}
                        className="weather-home__ratio-icon"
                        label={item.type}
                      />
                      <strong>{item.type}</strong>
                      <em>{Math.round(item.ratio * 100)}%</em>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="weather-home__panel weather-home__panel--forecast">
              <div className="weather-home__panel-head">
                <h2>7 天天气预报</h2>
              </div>

              <div className="weather-home__forecast-table">
                <div className="weather-home__forecast-header">
                  <span>日期</span>
                  <span>天气</span>
                  <span>高/低</span>
                  <span>降水</span>
                  <span>风力</span>
                </div>

                {homeData.daily.map((item) => (
                  <div className="weather-home__forecast-row" key={item.fxDate}>
                    <div className="weather-home__forecast-date">
                      <span>{formatShortDate(item.fxDate)}</span>
                      <em>{formatWeekLabel(item.fxDate)}</em>
                    </div>
                    <div className="weather-home__forecast-weather">
                      <WeatherIcon
                        code={item.iconDay}
                        className="weather-home__forecast-glyph"
                        label={getDailyTypeLabel(item)}
                      />
                      <em>{getDailyTypeLabel(item)}</em>
                    </div>
                    <strong>{item.tempMax}° / {item.tempMin}°</strong>
                    <span>{item.precip} mm</span>
                    <span>{item.windDirDay} {item.windScaleDay}级</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="weather-home__center">
            <section className={`weather-home__hero weather-home__hero--${viewModel.weatherScene}`}>
              <div className="weather-home__hero-overlay" />
              <div className="weather-home__hero-scene" aria-hidden="true">
                <div className="weather-home__hero-glow" />
                <div className="weather-home__hero-orb" />
                <div className="weather-home__hero-water" />
                <div className="weather-home__hero-skyline" />
              </div>

              <div className="weather-home__hero-content">
                <div className="weather-home__hero-main">
                  <div className="weather-home__hero-temp">
                    <span className="weather-home__hero-degree">
                      {toNumber(homeData.overview.weatherNow.temp).toFixed(1)}
                    </span>
                    <span className="weather-home__hero-unit">°C</span>
                  </div>

                  <div className="weather-home__hero-copy">
                    <div className="weather-home__hero-copy-card">
                      <WeatherIcon
                        code={homeData.overview.weatherNow.icon}
                        className="weather-home__hero-glyph"
                        label={homeData.overview.weatherNow.text}
                      />
                      <div className="weather-home__hero-copy-body">
                        <div className="weather-home__hero-copy-line">
                          <span className="weather-home__hero-copy-label">体感温度</span>
                          <span className="weather-home__hero-copy-value">
                            {homeData.overview.weatherNow.feelsLike}°C
                          </span>
                        </div>
                        <h2>{homeData.overview.weatherNow.text}</h2>
                        <p>{homeData.minutely.summary || '未来两小时天气平稳，当前无明显降水。'}</p>
                        <span className="weather-home__hero-advice">{viewModel.heroAdvice}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="weather-home__hero-metrics">
                  {viewModel.heroMetrics.map((item) => (
                    <div
                      className={`weather-home__hero-metric weather-home__hero-metric--${item.accent}`}
                      key={item.key}
                    >
                      <div className="weather-home__hero-metric-head">
                        <span className="weather-home__hero-metric-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="weather-home__hero-metric-label">{item.label}</span>
                      </div>
                      <strong className="weather-home__hero-metric-value">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="weather-home__panel weather-home__panel--hourly">
              <div className="weather-home__panel-head">
                <h2>24 小时趋势预报</h2>
                <div className="weather-home__legend">
                  <span className="weather-home__legend-item weather-home__legend-item--amber">温度(°C)</span>
                  <span className="weather-home__legend-item weather-home__legend-item--cyan">降水概率(%)</span>
                </div>
              </div>

              <div className="weather-home__hourly-icons">
                {viewModel.hourlySample.map((item) => (
                  <div className="weather-home__hourly-icon" key={item.fxTime}>
                    <WeatherIcon code={item.icon} className="weather-home__hourly-weather-icon" />
                    <em>{formatTime(item.fxTime)}</em>
                  </div>
                ))}
              </div>

              <div className="weather-home__hourly-chart">
                <DashboardChart option={buildHourlyChartOption(homeData.hourly)} />
              </div>

              <div className="weather-home__sunline">
                <span>日出 {homeData.overview.todaySummary.sunrise}</span>
                <span>日落 {homeData.overview.todaySummary.sunset}</span>
              </div>
            </section>
          </section>

          <aside className="weather-home__sidebar weather-home__sidebar--right">
            <section className="weather-home__panel weather-home__panel--air">
              <div className="weather-home__panel-head">
                <h2>空气质量</h2>
                <span>{formatTime(homeData.airNow.pubTime || homeData.overview.weatherNow.obsTime)} 更新</span>
              </div>

              <div className="weather-home__air-main">
                <div className="weather-home__air-score">
                  <span>AQI</span>
                  <strong style={{ color: aqiColor }}>{homeData.airNow.aqi}</strong>
                </div>
                <div className="weather-home__air-copy">
                  <em style={{ backgroundColor: `${aqiColor}26`, color: aqiColor }}>
                    {airLevelLabel}
                  </em>
                  <span>首要污染物</span>
                  <strong>{homeData.airNow.primaryPollutant || '暂无'}</strong>
                </div>
              </div>

              <div className="weather-home__pollutants">
                {[
                  ['PM2.5', homeData.airNow.pm2p5],
                  ['PM10', homeData.airNow.pm10],
                  ['SO₂', homeData.airNow.so2],
                  ['NO₂', homeData.airNow.no2],
                  ['O₃', homeData.airNow.o3],
                  ['CO', homeData.airNow.co],
                ].map(([label, value]) => (
                  <div className="weather-home__pollutant" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="weather-home__mini-chart">
                <h3>24 小时 AQI 趋势</h3>
                <DashboardChart option={buildAirChartOption(homeData.airHourly)} />
              </div>
            </section>

            <section className="weather-home__panel weather-home__panel--alert-card">
              <div className="weather-home__panel-head">
                <h2>预警信息</h2>
                <span>{formatTime(homeData.overview.weatherNow.obsTime)} 更新</span>
              </div>

              {primaryAlert ? (
                <div className="weather-home__alert-detail">
                  <div className="weather-home__alert-badge" style={{ backgroundColor: `${alertColor}20`, color: alertColor }}>
                    {primaryAlert.severity} {primaryAlert.eventType}
                  </div>
                  <h3>{primaryAlert.headline || primaryAlert.eventType}</h3>
                  <p>{primaryAlert.description || '请关注最新气象部门发布的提示信息。'}</p>
                  <div className="weather-home__alert-meta">
                    <span>发布时间 {formatTime(primaryAlert.publishedAt)}</span>
                    <span>有效期至 {formatTime(primaryAlert.expireTime)}</span>
                  </div>
                  <div className="weather-home__alert-note">
                    {primaryAlert.instruction || '请合理安排出行并留意临近预警。'}
                  </div>
                </div>
              ) : (
                <div className="weather-home__alert-empty">
                  <div className="weather-home__alert-empty-icon">✓</div>
                  <strong>当前无预警</strong>
                  <span>暂无气象灾害预警信息</span>
                </div>
              )}
            </section>

            <section className="weather-home__panel weather-home__panel--indices">
              <div className="weather-home__panel-head">
                <h2>生活指数</h2>
              </div>

              <div className="weather-home__indices-grid">
                {viewModel.lifeIndices.map((item) => (
                  <div
                    className={`weather-home__index-card weather-home__index-card--${item.accent}`}
                    key={item.key}
                  >
                    <div className="weather-home__index-icon">{item.icon}</div>
                    <div className="weather-home__index-copy">
                      <span>{item.name}</span>
                      <strong>{item.level}</strong>
                      <em>{item.text}</em>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </main>

        <section className="weather-home__bottom-grid">
          <section className="weather-home__panel weather-home__panel--bottom">
            <div className="weather-home__panel-head">
              <h2>近 7 天温度趋势</h2>
              <span>单位: °C</span>
            </div>
            <div className="weather-home__bottom-chart">
              <DashboardChart option={buildTemperatureTrendOption(viewModel.recentSevenSeries)} />
            </div>
          </section>

          <section className="weather-home__panel weather-home__panel--bottom">
            <div className="weather-home__panel-head">
              <h2>近 7 天降水趋势</h2>
              <span>单位: mm</span>
            </div>
            <div className="weather-home__bottom-chart">
              <DashboardChart option={buildPrecipitationTrendOption(viewModel.recentSevenSeries)} />
            </div>
          </section>

          <section className="weather-home__panel weather-home__panel--bottom weather-home__panel--precip-summary">
            <div className="weather-home__panel-head">
              <h2>{viewModel.displayMonthlyPrecipitation.title}</h2>
              <span>单位: mm</span>
            </div>
            <div className="weather-home__precip-hero">
              <strong>{viewModel.displayMonthlyPrecipitation.value}</strong>
              <em>mm</em>
            </div>
            <div className="weather-home__precip-visual">
              <WeatherIcon code="305" className="weather-home__precip-icon" />
            </div>
            <div className="weather-home__precip-footnote">
              <span>{viewModel.precipitationDelta}</span>
              <em>{viewModel.displayMonthlyPrecipitation.note}</em>
            </div>
          </section>

          <section className="weather-home__panel weather-home__panel--bottom weather-home__panel--ratio-card">
            <div className="weather-home__panel-head">
              <h2>{viewModel.weatherRatioSummary.title}</h2>
              <span>{viewModel.weatherRatioSummary.note}</span>
            </div>
            <div className="weather-home__ratio-chart">
              <DashboardChart option={buildWeatherRatioOption(viewModel.weatherRatiosAll)} />
            </div>
            <div className="weather-home__ratio-legend-list">
              {viewModel.weatherRatiosAll.slice(0, 4).map((item) => (
                <div className="weather-home__ratio-legend-row" key={item.type}>
                  <span>{item.type}</span>
                  <strong>{Math.round(item.ratio * 100)}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="weather-home__panel weather-home__panel--bottom weather-home__panel--highlights">
            <div className="weather-home__panel-head">
              <h2>{viewModel.highlightSummary.title}</h2>
              <span>{viewModel.highlightSummary.note}</span>
            </div>
            <ul className="weather-home__highlight-list">
              {viewModel.monthlyHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>

        <footer className="weather-home__footer">
          <span>数据来源：和风天气</span>
          <span>本地时间：{homeData.overview.location.tz} (UTC+08:00)</span>
          <span>免责声明：本页面数据仅供参考，不作为决策依据</span>
        </footer>
      </div>

      <CityDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
