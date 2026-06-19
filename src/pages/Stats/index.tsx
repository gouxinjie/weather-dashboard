/**
 * @component Stats
 * @description 统计详情页，展示最近 10 天趋势、周月明细、天气类型占比与数据说明
 * @author
 * @created 2026-06-13
 * @updated 2026-06-19
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { EChartsOption } from 'echarts';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import cityPreviewImage from '../../assets/bg.png';
import { BrandMark } from '../../components/commons/BrandMark';
import { DashboardChart } from '../../components/commons/DashboardChart';
import { WeatherIcon } from '../../components/commons/WeatherIcon';
import { AQI_CATEGORY_COLORS } from '../../constants';
import { useCityStore } from '../../stores/cityStore';
import type {
  DailyStatsRecord,
  HomeData,
  StatsDetailData,
  WeatherTypeRatio,
} from '../../types';
import { api } from '../../utils/request';
import { resolveWeatherTypeIconCode } from '../../utils/weatherIcon';
import './index.scss';

/** 可跳转的详情页分区 */
type SectionId = 'trend' | 'weekly' | 'monthly' | 'ratio' | 'notes';

/** 趋势范围类型 */
type TrendRange = 7 | 10;

/** 周统计明细行 */
interface WeeklyDetailRow {
  weekLabel: string;
  dateRange: string;
  avgTemp: string;
  maxTemp: string;
  minTemp: string;
  precipitation: string;
  rainyDays: number;
  aqiAvg: string;
  weatherType: string;
  sampleText: string;
}

/** 月统计明细行 */
interface MonthlyDetailRow {
  month: string;
  avgTemp: string;
  maxTemp: string;
  minTemp: string;
  precipitation: string;
  rainyDays: number;
  aqiAvg: string;
  sampleText: string;
}

/** 趋势图展示项 */
interface TrendChartRecord {
  statDate: string;
  maxTemp: number | null;
  minTemp: number | null;
  avgTemp: number | null;
  precipitation: number | null;
  aqiAvg: number | null;
}

/** 导航项 */
interface SidebarNavItem {
  id: SectionId;
  label: string;
  icon: string;
}

/** 降水摘要项 */
interface PrecipSummaryItem {
  label: string;
  value: string;
  note: string;
}

/** 数据说明项 */
interface NoteItem {
  label: string;
  value: string;
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: 'trend', label: '近10天趋势', icon: '◔' },
  { id: 'weekly', label: '周统计明细', icon: '⌗' },
  { id: 'monthly', label: '月统计明细', icon: '◫' },
  { id: 'ratio', label: '天气类型占比', icon: '◌' },
  { id: 'notes', label: '数据说明', icon: 'ⓘ' },
];

const TREND_OPTIONS: Array<{ label: string; value?: TrendRange; disabled?: boolean }> = [
  { label: '7天', value: 7 },
  { label: '10天', value: 10 },
  { label: '90天', disabled: true },
  { label: '自定义', disabled: true },
];

const WEATHER_RATIO_FALLBACK_COLORS = ['#dea63b', '#42bbe0', '#5e95ca', '#b7b8b5', '#4d86bb', '#78a8d6'];

/**
 * 获取侧边栏导航标题
 * @param sectionId 分区标识，必填，默认值：无
 * @returns 标题文本
 */
function getSidebarNavLabel(sectionId: SectionId): string {
  switch (sectionId) {
    case 'trend':
      return '近10天趋势';
    case 'weekly':
      return '周统计明细';
    case 'monthly':
      return '月统计明细';
    case 'ratio':
      return '天气类型占比';
    case 'notes':
      return '数据说明';
    default:
      return '';
  }
}

/**
 * 渲染侧边栏导航图标
 * @param sectionId 分区标识，必填，默认值：无
 * @returns 图标节点
 */
function renderSidebarIcon(sectionId: SectionId): JSX.Element {
  switch (sectionId) {
    case 'trend':
      return (
        <svg viewBox="0 0 16 16" focusable="false">
          <path
            d="M3.2 11.7V8.8M6.6 11.7V6.6M10 11.7V4.9M13 11.7V9.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path
            d="m3.2 8.8 3.4-2.2 3.4-1.7 3 4.1"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.15"
          />
          <circle cx="3.2" cy="8.8" fill="currentColor" r="0.8" />
          <circle cx="6.6" cy="6.6" fill="currentColor" r="0.8" />
          <circle cx="10" cy="4.9" fill="currentColor" r="0.8" />
          <circle cx="13" cy="9" fill="currentColor" r="0.8" />
          <path
            d="M2.4 12.5h11.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.05"
          />
        </svg>
      );
    case 'weekly':
      return (
        <svg viewBox="0 0 16 16" focusable="false">
          <path
            d="M3.4 10.8 6.1 7.4 8.4 8.7 12.3 4.8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.15"
          />
          <circle cx="3.4" cy="10.8" fill="currentColor" r="1" />
          <circle cx="6.1" cy="7.4" fill="currentColor" r="1" />
          <circle cx="8.4" cy="8.7" fill="currentColor" r="1" />
          <circle cx="12.3" cy="4.8" fill="currentColor" r="1" />
          <path
            d="M3.1 12.4h9.7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1"
          />
        </svg>
      );
    case 'monthly':
      return (
        <svg viewBox="0 0 16 16" focusable="false">
          <rect
            fill="none"
            height="10.4"
            rx="1.6"
            stroke="currentColor"
            strokeWidth="1.1"
            width="8.8"
            x="3.6"
            y="2.8"
          />
          <path
            d="M5.6 2.3v2.1M10.4 2.3v2.1M4.3 5.8h7.4M5.2 8.2h5.6M5.2 10.5h4.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.1"
          />
        </svg>
      );
    case 'ratio':
      return (
        <svg viewBox="0 0 16 16" focusable="false">
          <path
            d="M5.2 11.9a2.8 2.8 0 1 1 .4-5.6 3.6 3.6 0 0 1 6.5 1.1 2.4 2.4 0 0 1-.7 4.5H5.2Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.1"
          />
          <path
            d="M6.2 9.2h3.9M7.7 7.9l1.1 1.3 1.2-1.7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.1"
          />
        </svg>
      );
    case 'notes':
      return (
        <svg viewBox="0 0 16 16" focusable="false">
          <circle cx="8" cy="8" fill="none" r="5.7" stroke="currentColor" strokeWidth="1.1" />
          <path
            d="M6.6 6.1c.2-.8.9-1.3 1.9-1.3 1.1 0 1.8.6 1.8 1.5 0 .9-.5 1.3-1.2 1.8-.7.4-1 .8-1 1.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.1"
          />
          <circle cx="8" cy="11.6" fill="currentColor" r="0.75" />
        </svg>
      );
    default:
      return <></>;
  }
}

/**
 * 转换为数字
 * @param value 原始值，必填，默认值：无
 * @returns 数字结果
 */
function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return 0;
  }

  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

/**
 * 格式化天气占比文本
 * @param ratio 占比值
 * @returns 百分比文本
 */
function formatRatioPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * 获取天气占比配色
 * @param index 序号
 * @returns 色值
 */
function getWeatherRatioColor(index: number): string {
  return WEATHER_RATIO_FALLBACK_COLORS[index % WEATHER_RATIO_FALLBACK_COLORS.length];
}

/**
 * 获取天气类型占比主题色
 * @param weatherType 天气类型
 * @param index 序号
 * @returns 主题色
 */
function getWeatherRatioThemeColor(weatherType: string, index: number): string {
  const normalizedType = weatherType.trim();

  if (normalizedType.includes('晴')) {
    return '#eea625';
  }

  if (normalizedType.includes('多云')) {
    return '#d7d3cb';
  }

  if (normalizedType.includes('阴')) {
    return '#5b87b4';
  }

  if (normalizedType.includes('雾') || normalizedType.includes('霾')) {
    return '#8fa5b7';
  }

  if (normalizedType.includes('小雨')) {
    return '#53bbe5';
  }

  if (normalizedType.includes('中雨')) {
    return '#3fa4d8';
  }

  if (normalizedType.includes('大雨') || normalizedType.includes('暴雨')) {
    return '#2f84bf';
  }

  if (normalizedType.includes('雪')) {
    return '#dbe7ef';
  }

  return getWeatherRatioColor(index);
}

/**
 * 格式化数值
 * @param value 数值，必填，默认值：无
 * @param digits 小数位数，非必填，默认值：1
 * @returns 格式化后的文本
 */
function formatMetric(value: number, digits: number = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '--';
}

/**
 * 格式化趋势图 tooltip 数值
 * @param value 原始值，必填，默认值：无
 * @param digits 小数位数，非必填，默认值：2
 * @returns tooltip 展示文本
 */
function formatTooltipMetricValue(value: unknown, digits: number = 2): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(digits) : '--';
  }

  if (typeof value === 'string') {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue.toFixed(digits) : '--';
  }

  if (Array.isArray(value) && value.length > 0) {
    return formatTooltipMetricValue(value[value.length - 1], digits);
  }

  return '--';
}

/**
 * 判断 AQI 数值是否有效
 * @param value AQI 数值，必填，默认值：无
 * @returns 是否为有效 AQI 数值
 */
function isValidAqiValue(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * 格式化日期为 yyyy-MM-dd
 * @param date 日期对象，必填，默认值：无
 * @returns 日期文本
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化为 MM/DD
 * @param value 日期文本，必填，默认值：无
 * @returns 简短日期
 */
function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 获取自然周开始日期
 * @param value 日期文本，必填，默认值：无
 * @returns 周一日期
 */
function getWeekStartDate(value: string): Date {
  const date = new Date(`${value}T00:00:00`);
  const weekday = date.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * 计算 ISO 周序号
 * @param date 周起始日期，必填，默认值：无
 * @returns 周序号
 */
function getIsoWeekNumber(date: Date): number {
  const targetDate = new Date(date);
  const weekday = (date.getDay() + 6) % 7;
  targetDate.setDate(targetDate.getDate() - weekday + 3);
  const firstThursday = new Date(targetDate.getFullYear(), 0, 4);
  const firstWeekday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstWeekday + 3);
  const diff = targetDate.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / 604800000);
}

/**
 * 计算天气类型占比
 * @param records 日统计列表，必填，默认值：无
 * @returns 占比列表
 */
function buildWeatherRatios(records: DailyStatsRecord[]): WeatherTypeRatio[] {
  if (records.length === 0) {
    return [];
  }

  const counter = new Map<string, number>();

  records.forEach((item) => {
    const label = item.weatherType || '未知';
    counter.set(label, (counter.get(label) || 0) + 1);
  });

  return Array.from(counter.entries())
    .map(([type, count]) => ({
      type,
      count,
      ratio: count / records.length,
    }))
    .sort((previous, current) => current.count - previous.count);
}

/**
 * 获取占比中的主天气类型
 * @param records 日统计列表，必填，默认值：无
 * @returns 主天气类型
 */
function getPrimaryWeatherType(records: DailyStatsRecord[]): string {
  return buildWeatherRatios(records)[0]?.type || '暂无样本';
}

/**
 * 获取农历文本
 * @param date 当前日期，必填，默认值：无
 * @param timeZone 时区，必填，默认值：无
 * @returns 农历文本
 */
function formatLunarDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      timeZone,
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return '农历未知';
  }
}

/**
 * 构建顶部时间信息
 * @param date 当前日期，必填，默认值：无
 * @param timeZone 时区，必填，默认值：无
 * @returns 顶部展示所需时间元数据
 */
function buildTimeMeta(
  date: Date,
  timeZone: string
): { dateText: string; timeText: string; weekText: string; lunarText: string } {
  const dateText = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const timeText = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);

  const weekText = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    weekday: 'long',
  }).format(date);

  return {
    dateText,
    timeText,
    weekText,
    lunarText: formatLunarDate(date, timeZone),
  };
}

/**
 * 构建周统计明细
 * @param records 日统计列表，必填，默认值：无
 * @returns 周统计明细列表
 */
function buildWeeklyRows(records: DailyStatsRecord[]): WeeklyDetailRow[] {
  const groups = new Map<string, DailyStatsRecord[]>();

  records.forEach((item) => {
    const weekStart = formatDate(getWeekStartDate(item.statDate));
    const currentGroup = groups.get(weekStart) || [];
    currentGroup.push(item);
    groups.set(weekStart, currentGroup);
  });

  return Array.from(groups.entries())
    .sort((previous, current) => current[0].localeCompare(previous[0]))
    .map(([weekStart, items]) => {
      const startDate = new Date(`${weekStart}T00:00:00`);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      const avgTemperature =
        items.reduce((total, item) => total + item.avgTemp, 0) / items.length;
      const maxTemperature = Math.max(...items.map((item) => item.maxTemp));
      const minTemperature = Math.min(...items.map((item) => item.minTemp));
      const precipitation = items.reduce((total, item) => total + item.precipitation, 0);
      const rainyDays = items.filter((item) => item.precipitation > 0.1).length;
      const aqiSamples = items.map((item) => item.aqiAvg).filter(isValidAqiValue);
      const aqiAverage =
        aqiSamples.length > 0
          ? aqiSamples.reduce((total, item) => total + item, 0) / aqiSamples.length
          : NaN;

      return {
        weekLabel: `第${getIsoWeekNumber(startDate)}周`,
        dateRange: `${formatShortDate(weekStart)} - ${formatShortDate(formatDate(endDate))}`,
        avgTemp: formatMetric(avgTemperature),
        maxTemp: formatMetric(maxTemperature),
        minTemp: formatMetric(minTemperature),
        precipitation: formatMetric(precipitation),
        rainyDays,
        aqiAvg: Number.isFinite(aqiAverage) ? String(Math.round(aqiAverage)) : '--',
        weatherType: getPrimaryWeatherType(items),
        sampleText: `${items.length}/7天`,
      };
    });
}

/**
 * 构建月统计明细
 * @param records 日统计列表，必填，默认值：无
 * @returns 月统计明细列表
 */
function buildMonthlyRows(records: DailyStatsRecord[]): MonthlyDetailRow[] {
  const groups = new Map<string, DailyStatsRecord[]>();

  records.forEach((item) => {
    const month = item.statDate.slice(0, 7);
    const currentGroup = groups.get(month) || [];
    currentGroup.push(item);
    groups.set(month, currentGroup);
  });

  return Array.from(groups.entries())
    .sort((previous, current) => current[0].localeCompare(previous[0]))
    .map(([month, items]) => {
      const avgTemperature =
        items.reduce((total, item) => total + item.avgTemp, 0) / items.length;
      const maxTemperature = Math.max(...items.map((item) => item.maxTemp));
      const minTemperature = Math.min(...items.map((item) => item.minTemp));
      const precipitation = items.reduce((total, item) => total + item.precipitation, 0);
      const rainyDays = items.filter((item) => item.precipitation > 0.1).length;
      const aqiSamples = items.map((item) => item.aqiAvg).filter(isValidAqiValue);
      const aqiAverage =
        aqiSamples.length > 0
          ? aqiSamples.reduce((total, item) => total + item, 0) / aqiSamples.length
          : NaN;
      const year = Number.parseInt(month.slice(0, 4), 10);
      const monthIndex = Number.parseInt(month.slice(5, 7), 10);
      const expectedDays = new Date(year, monthIndex, 0).getDate();

      return {
        month,
        avgTemp: formatMetric(avgTemperature),
        maxTemp: formatMetric(maxTemperature),
        minTemp: formatMetric(minTemperature),
        precipitation: formatMetric(precipitation),
        rainyDays,
        aqiAvg: Number.isFinite(aqiAverage) ? String(Math.round(aqiAverage)) : '--',
        sampleText: `${items.length}/${expectedDays}天`,
      };
    });
}

/**
 * 获取分区哈希值
 * @param hash 路由哈希，必填，默认值：无
 * @returns 分区 ID
 */
function parseSectionHash(hash: string): SectionId | null {
  const sectionId = hash.replace('#', '');
  if (SIDEBAR_ITEMS.some((item) => item.id === sectionId)) {
    return sectionId as SectionId;
  }

  return null;
}

/**
 * 构建温度趋势图配置
 * @param records 日统计列表，必填，默认值：无
 * @returns ECharts 配置
 */
function buildTemperatureOption(records: TrendChartRecord[]): EChartsOption {
  const axisInterval = records.length > 14 ? 3 : 0;
  const lastIndex = Math.max(records.length - 1, 0);

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 18, 27, 0.96)',
      borderColor: 'rgba(104, 143, 159, 0.26)',
      textStyle: {
        color: '#dbe9f0',
      },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const firstItem = items[0];

        if (typeof firstItem !== 'object' || firstItem === null) {
          return '暂无数据';
        }

        const axisLabel =
          'axisValueLabel' in firstItem && typeof firstItem.axisValueLabel === 'string'
            ? firstItem.axisValueLabel
            : 'name' in firstItem && typeof firstItem.name === 'string'
              ? firstItem.name
              : '--';

        const lines = items
          .map((item) => {
            if (typeof item !== 'object' || item === null) {
              return null;
            }

            const marker = 'marker' in item && typeof item.marker === 'string' ? item.marker : '';
            const seriesName =
              'seriesName' in item && typeof item.seriesName === 'string'
                ? item.seriesName
                : '温度';
            const valueText = 'value' in item ? formatTooltipMetricValue(item.value, 2) : '--';

            return `${marker}${seriesName} ${valueText}`;
          })
          .filter((line): line is string => Boolean(line));

        return [axisLabel, ...lines].join('<br />');
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 6,
      textStyle: {
        color: '#8ea6b3',
        fontSize: 11,
      },
      data: ['最高温度', '平均温度', '最低温度'],
    },
    grid: {
      top: 34,
      right: 12,
      bottom: 24,
      left: 38,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: records.map((item) => formatShortDate(item.statDate)),
      axisLabel: {
        color: '#7790a0',
        fontSize: 10,
        formatter: (value: string, index: number) => {
          if (index === 0 || index === lastIndex || index % (axisInterval + 1) === 0) {
            return value;
          }

          return '';
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(95, 129, 146, 0.22)',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '°C',
      nameTextStyle: {
        color: '#7790a0',
        padding: [0, 0, 0, -6],
      },
      axisLabel: {
        color: '#7790a0',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(95, 129, 146, 0.12)',
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
        symbolSize: 5,
        data: records.map((item) => item.maxTemp),
        lineStyle: {
          width: 2,
          color: '#f4b343',
        },
        itemStyle: {
          color: '#f4b343',
        },
      },
      {
        name: '平均温度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: records.map((item) => item.avgTemp),
        lineStyle: {
          width: 2,
          color: '#4fc3d4',
        },
        itemStyle: {
          color: '#4fc3d4',
        },
      },
      {
        name: '最低温度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: records.map((item) => item.minTemp),
        lineStyle: {
          width: 2,
          color: '#74d7d5',
        },
        itemStyle: {
          color: '#74d7d5',
        },
      },
    ],
  };
}

/**
 * 构建降水趋势图配置
 * @param records 日统计列表，必填，默认值：无
 * @returns ECharts 配置
 */
function buildPrecipitationOption(records: TrendChartRecord[]): EChartsOption {
  const axisInterval = records.length > 14 ? 3 : 0;
  const lastIndex = Math.max(records.length - 1, 0);

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 18, 27, 0.96)',
      borderColor: 'rgba(104, 143, 159, 0.26)',
      textStyle: {
        color: '#dbe9f0',
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 6,
      textStyle: {
        color: '#8ea6b3',
        fontSize: 11,
      },
      data: ['降水量', '降水标记'],
    },
    grid: {
      top: 34,
      right: 40,
      bottom: 24,
      left: 38,
    },
    xAxis: {
      type: 'category',
      data: records.map((item) => formatShortDate(item.statDate)),
      axisLabel: {
        color: '#7790a0',
        fontSize: 10,
        formatter: (value: string, index: number) => {
          if (index === 0 || index === lastIndex || index % (axisInterval + 1) === 0) {
            return value;
          }

          return '';
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(95, 129, 146, 0.22)',
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'mm',
        nameTextStyle: {
          color: '#7790a0',
        },
        axisLabel: {
          color: '#7790a0',
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(95, 129, 146, 0.12)',
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        name: '天',
        min: 0,
        max: 1,
        interval: 1,
        nameTextStyle: {
          color: '#7790a0',
        },
        axisLabel: {
          color: '#7790a0',
          formatter: (value: number) => (value === 1 ? '1' : '0'),
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: '降水量',
        type: 'bar',
        barWidth: 10,
        data: records.map((item) => item.precipitation),
        itemStyle: {
          color: '#59d0d4',
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '降水标记',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: records.map((item) =>
          item.precipitation === null ? null : item.precipitation > 0.1 ? 1 : 0
        ),
        lineStyle: {
          width: 2,
          color: '#3d8bd1',
        },
        itemStyle: {
          color: '#3d8bd1',
        },
      },
    ],
  };
}

/**
 * 构建 AQI 趋势图配置
 * @param records 日统计列表，必填，默认值：无
 * @returns ECharts 配置
 */
function buildAqiOption(records: TrendChartRecord[]): EChartsOption {
  const axisInterval = records.length > 14 ? 3 : 0;
  const lastIndex = Math.max(records.length - 1, 0);

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 18, 27, 0.96)',
      borderColor: 'rgba(104, 143, 159, 0.26)',
      textStyle: {
        color: '#dbe9f0',
      },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const firstItem = items[0];

        if (typeof firstItem !== 'object' || firstItem === null) {
          return '暂无数据';
        }

        const axisLabel =
          'axisValueLabel' in firstItem && typeof firstItem.axisValueLabel === 'string'
            ? firstItem.axisValueLabel
            : 'name' in firstItem && typeof firstItem.name === 'string'
              ? firstItem.name
              : '--';

        const lines = items
          .map((item) => {
            if (typeof item !== 'object' || item === null) {
              return null;
            }

            const marker = 'marker' in item && typeof item.marker === 'string' ? item.marker : '';
            const seriesName =
              'seriesName' in item && typeof item.seriesName === 'string' ? item.seriesName : 'AQI';
            const value = 'value' in item ? toNumber(item.value) : NaN;

            return `${marker}${seriesName} ${formatMetric(value, 2)}`;
          })
          .filter((line): line is string => Boolean(line));

        return [axisLabel, ...lines].join('<br />');
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 6,
      textStyle: {
        color: '#8ea6b3',
        fontSize: 11,
      },
      data: ['AQI'],
    },
    grid: {
      top: 34,
      right: 12,
      bottom: 24,
      left: 38,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: records.map((item) => formatShortDate(item.statDate)),
      axisLabel: {
        color: '#7790a0',
        fontSize: 10,
        formatter: (value: string, index: number) => {
          if (index === 0 || index === lastIndex || index % (axisInterval + 1) === 0) {
            return value;
          }

          return '';
        },
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(95, 129, 146, 0.22)',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'AQI',
      min: 0,
      axisLabel: {
        color: '#7790a0',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(95, 129, 146, 0.12)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'AQI',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        data: records.map((item) => item.aqiAvg),
        lineStyle: {
          width: 2,
          color: '#8fcf59',
        },
        itemStyle: {
          color: '#8fcf59',
        },
        areaStyle: {
          color: 'rgba(143, 207, 89, 0.12)',
        },
        markArea: {
          silent: true,
          itemStyle: {
            opacity: 0.14,
          },
          data: [
            [{ yAxis: 0, itemStyle: { color: '#2f8f53' } }, { yAxis: 50 }],
            [{ yAxis: 50, itemStyle: { color: '#b8ad43' } }, { yAxis: 100 }],
            [{ yAxis: 100, itemStyle: { color: '#d48746' } }, { yAxis: 150 }],
            [{ yAxis: 150, itemStyle: { color: '#b75343' } }, { yAxis: 200 }],
            [{ yAxis: 200, itemStyle: { color: '#87353f' } }, { yAxis: 300 }],
          ],
        },
      },
    ],
  };
}

/**
 * 构建天气类型占比图配置
 * @param ratios 占比列表，必填，默认值：无
 * @returns ECharts 配置
 */
function buildWeatherRatioOption(ratios: WeatherTypeRatio[]): EChartsOption {
  const totalCount = ratios.reduce((total, item) => total + item.count, 0);

  return {
    backgroundColor: 'transparent',
    color: ratios.map((item, index) => getWeatherRatioThemeColor(item.type, index)),
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 18, 27, 0.96)',
      borderColor: 'rgba(104, 143, 159, 0.26)',
      textStyle: {
        color: '#dbe9f0',
      },
      formatter: (params: unknown) => {
        const resolvedParams = Array.isArray(params) ? params[0] : params;

        if (
          typeof resolvedParams !== 'object' ||
          resolvedParams === null ||
          !('name' in resolvedParams)
        ) {
          return '暂无数据';
        }

        const name =
          typeof resolvedParams.name === 'string' ? resolvedParams.name : '未知';
        const value =
          'value' in resolvedParams ? toNumber(resolvedParams.value) : 0;
        const percent =
          'percent' in resolvedParams && typeof resolvedParams.percent === 'number'
            ? resolvedParams.percent
            : 0;

        return `${name}<br />${value}天 / ${formatRatioPercent(percent / 100)}`;
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['64%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#08141d',
        },
        data: ratios.map((item, index) => ({
          name: item.type,
          value: item.count,
          itemStyle: {
            color: getWeatherRatioThemeColor(item.type, index),
          },
        })),
      },
    ],
    graphic: totalCount > 0
      ? [
          {
            type: 'group',
            left: '50%',
            top: '50%',
            silent: true,
            bounding: 'raw',
            children: [
              {
                type: 'text',
                x: 0,
                y: -12,
                style: {
                  text: `${totalCount}天`,
                  align: 'center',
                  verticalAlign: 'middle',
                  fill: '#f4ead2',
                  font: '700 24px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
                },
              },
              {
                type: 'text',
                x: 0,
                y: 14,
                style: {
                  text: '天气类型',
                  align: 'center',
                  verticalAlign: 'middle',
                  fill: '#8ea6b3',
                  font: '11px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
                },
              },
            ],
          },
        ]
      : [],
  };
}

/**
 * 获取 AQI 颜色
 * @param category AQI 等级，必填，默认值：无
 * @param aqiValue AQI 数值，非必填，默认值：无
 * @returns 颜色值
 */
function getAqiColor(category: string, aqiValue?: string): string {
  if (AQI_CATEGORY_COLORS[category]) {
    return AQI_CATEGORY_COLORS[category];
  }

  const numericValue = toNumber(aqiValue);

  if (numericValue <= 50) {
    return AQI_CATEGORY_COLORS['优'];
  }

  if (numericValue <= 100) {
    return AQI_CATEGORY_COLORS['良'];
  }

  if (numericValue <= 150) {
    return AQI_CATEGORY_COLORS['轻度污染'];
  }

  if (numericValue <= 200) {
    return AQI_CATEGORY_COLORS['中度污染'];
  }

  if (numericValue <= 300) {
    return AQI_CATEGORY_COLORS['重度污染'];
  }

  return AQI_CATEGORY_COLORS['严重污染'];
}

/**
 * 构建趋势图时间轴数据
 * @param records 原始统计记录，必填，默认值：无
 * @param days 展示天数，必填，默认值：无
 * @returns 补齐时间轴后的趋势图数据
 */
function buildTrendChartRecords(records: DailyStatsRecord[], days: TrendRange): TrendChartRecord[] {
  if (records.length === 0) {
    return [];
  }

  const recordMap = new Map(records.map((item) => [item.statDate, item]));
  const latestDate = new Date(`${records[records.length - 1].statDate}T00:00:00`);
  const trendRecords: TrendChartRecord[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const currentDate = new Date(latestDate);
    currentDate.setDate(latestDate.getDate() - index);
    const currentDateText = formatDate(currentDate);
    const matchedRecord = recordMap.get(currentDateText);

    trendRecords.push({
      statDate: currentDateText,
      maxTemp: matchedRecord?.maxTemp ?? null,
      minTemp: matchedRecord?.minTemp ?? null,
      avgTemp: matchedRecord?.avgTemp ?? null,
      precipitation: matchedRecord?.precipitation ?? null,
      aqiAvg: matchedRecord?.aqiAvg ?? null,
    });
  }

  return trendRecords;
}

/**
 * 统计详情页组件
 * @returns 页面内容
 */
export default function Stats(): JSX.Element {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const locationId = useCityStore((state) => state.locationId);
  const cityName = useCityStore((state) => state.cityName);
  const adm1 = useCityStore((state) => state.adm1);

  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [statsDetail, setStatsDetail] = useState<StatsDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>(10);
  const [activeSection, setActiveSection] = useState<SectionId>('trend');
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const trendSectionRef = useRef<HTMLElement | null>(null);
  const weeklySectionRef = useRef<HTMLElement | null>(null);
  const monthlySectionRef = useRef<HTMLElement | null>(null);
  const ratioSectionRef = useRef<HTMLElement | null>(null);
  const notesSectionRef = useRef<HTMLElement | null>(null);

  /**
   * 获取分区 DOM
   * @param sectionId 分区 ID，必填，默认值：无
   * @returns 分区元素
   */
  const getSectionElement = useCallback((sectionId: SectionId): HTMLElement | null => {
    if (sectionId === 'trend') {
      return trendSectionRef.current;
    }

    if (sectionId === 'weekly') {
      return weeklySectionRef.current;
    }

    if (sectionId === 'monthly') {
      return monthlySectionRef.current;
    }

    if (sectionId === 'ratio') {
      return ratioSectionRef.current;
    }

    return notesSectionRef.current;
  }, []);

  /**
   * 加载详情页数据
   */
  const fetchData = useCallback(async () => {
    if (!locationId) {
      setError('缺少城市标识，无法加载统计详情');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [homeResult, statsResult] = await Promise.all([
        api.getHomeData(locationId),
        api.getStatsDetail(locationId),
      ]);

      setHomeData(homeResult);
      setStatsDetail(statsResult);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '统计详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const sortedDailyRecords = useMemo(() => {
    const records = statsDetail?.daily30 || [];
    return [...records].sort((previous, current) => previous.statDate.localeCompare(current.statDate));
  }, [statsDetail]);

  const displayedRecords = useMemo(() => {
    return sortedDailyRecords.slice(-trendRange);
  }, [sortedDailyRecords, trendRange]);

  const trendChartRecords = useMemo(
    () => buildTrendChartRecords(sortedDailyRecords, trendRange),
    [sortedDailyRecords, trendRange]
  );

  const samplePeriod = useMemo(() => {
    if (displayedRecords.length === 0) {
      return '暂无样本期';
    }

    const startDate = displayedRecords[0].statDate;
    const endDate = displayedRecords[displayedRecords.length - 1].statDate;
    return `${startDate} ~ ${endDate}（共${displayedRecords.length}天）`;
  }, [displayedRecords]);

  const trendWindowPeriod = useMemo(() => {
    if (trendChartRecords.length === 0) {
      return '暂无统计窗口';
    }

    const startDate = trendChartRecords[0].statDate;
    const endDate = trendChartRecords[trendChartRecords.length - 1].statDate;
    return `${startDate} ~ ${endDate}`;
  }, [trendChartRecords]);

  const trendCoverageText = useMemo(() => {
    return `已采样 ${displayedRecords.length}/${trendRange} 天`;
  }, [displayedRecords.length, trendRange]);

  const weeklyRows = useMemo(() => buildWeeklyRows(sortedDailyRecords), [sortedDailyRecords]);
  const monthlyRows = useMemo(() => buildMonthlyRows(sortedDailyRecords), [sortedDailyRecords]);
  const weatherRatios = useMemo(() => buildWeatherRatios(displayedRecords), [displayedRecords]);

  const precipitationSummaryItems = useMemo<PrecipSummaryItem[]>(() => {
    if (displayedRecords.length === 0) {
      return [
        { label: '累计降水量', value: '--', note: '暂无样本' },
        { label: '降水天数', value: '--', note: '暂无样本' },
        { label: '最大日降水', value: '--', note: '暂无样本' },
        { label: '无降水天数', value: '--', note: '暂无样本' },
      ];
    }

    const totalPrecipitation = displayedRecords.reduce(
      (total, item) => total + item.precipitation,
      0
    );
    const rainyDays = displayedRecords.filter((item) => item.precipitation > 0.1).length;
    const maxPrecipitation = Math.max(...displayedRecords.map((item) => item.precipitation));

    return [
      { label: '累计降水量', value: `${formatMetric(totalPrecipitation)} mm`, note: '样本区间累计' },
      { label: '降水天数', value: `${rainyDays} 天`, note: '日降水 > 0.1mm' },
      { label: '最大日降水', value: `${formatMetric(maxPrecipitation)} mm`, note: '区间单日峰值' },
      {
        label: '无降水天数',
        value: `${displayedRecords.length - rainyDays} 天`,
        note: '样本区间统计',
      },
    ];
  }, [displayedRecords]);

  const noteItems = useMemo<NoteItem[]>(() => {
    const sampleCount = displayedRecords.length;
    const updateTime =
      homeData?.overview.weatherNow.obsTime ||
      homeData?.airNow.pubTime ||
      '--';
    const timezone = homeData?.overview.location.tz || 'Asia/Shanghai';

    return [
      { label: '样本说明', value: `${samplePeriod}` },
      { label: '统计模式', value: '本页图表按自然日聚合，周/月统计按自然周期重算' },
      { label: '数据更新时间', value: updateTime },
      { label: '数据来源', value: '和风天气（QWeather）与本地统计快照' },
      { label: '时区', value: timezone },
      {
        label: 'AQI 说明',
        value:
          sampleCount > 0
            ? 'AQI 日均值基于本地快照样本计算，部分日期可能因缺样本出现偏差'
            : '暂无 AQI 样本',
      },
    ];
  }, [displayedRecords.length, homeData, samplePeriod]);

  const currentTimeMeta = useMemo(() => {
    const timezone = homeData?.overview.location.tz || 'Asia/Shanghai';
    return buildTimeMeta(currentTime, timezone);
  }, [currentTime, homeData?.overview.location.tz]);

  const aqiColor = useMemo(
    () => getAqiColor(homeData?.airNow.category || '', homeData?.airNow.aqi),
    [homeData?.airNow.aqi, homeData?.airNow.category]
  );

  const hasAlert = Boolean(homeData?.overview.alertSummary.hasAlert);

  const scrollToSection = useCallback(
    (sectionId: SectionId) => {
      const targetElement = getSectionElement(sectionId);

      if (!targetElement) {
        return;
      }

      setActiveSection(sectionId);
      navigate(`/stats#${sectionId}`, { replace: true });
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [getSectionElement, navigate]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((previous, current) => current.intersectionRatio - previous.intersectionRatio)[0];

        if (visibleEntry?.target instanceof HTMLElement) {
          const sectionId = visibleEntry.target.dataset.sectionId;
          if (parseSectionHash(`#${sectionId || ''}`)) {
            setActiveSection(sectionId as SectionId);
          }
        }
      },
      {
        threshold: [0.2, 0.45, 0.75],
        rootMargin: '-18% 0px -55% 0px',
      }
    );

    const elements = SIDEBAR_ITEMS.map((item) => getSectionElement(item.id)).filter(
      (item): item is HTMLElement => item instanceof HTMLElement
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [getSectionElement]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetSection = parseSectionHash(routerLocation.hash);

    if (!targetSection) {
      return;
    }

    const timer = window.setTimeout(() => {
      const targetElement = getSectionElement(targetSection);
      if (!targetElement) {
        return;
      }

      setActiveSection(targetSection);
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [getSectionElement, loading, routerLocation.hash]);

  if (loading) {
    return (
      <div className="stats-page stats-page--state">
        <div className="stats-page__state-card">
          <div className="stats-page__state-spinner" />
          <h2 className="stats-page__state-title">正在加载统计详情</h2>
          <span className="stats-page__state-note">读取最近 10 天样本与周月聚合数据</span>
        </div>
      </div>
    );
  }

  if (error || !homeData || !statsDetail) {
    return (
      <div className="stats-page stats-page--state">
        <div className="stats-page__state-card stats-page__state-card--error">
          <h2 className="stats-page__state-title">统计详情加载失败</h2>
          <span className="stats-page__state-note">{error || '未获取到统计详情数据'}</span>
          <button className="stats-page__state-action" onClick={fetchData} type="button">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="stats-page__shell">
        <header className="stats-page__topbar">
          <div className="stats-page__brand">
            <BrandMark className="stats-page__brand-mark" />
            <div className="stats-page__brand-copy">
              <h1 className="stats-page__brand-title">城市环境与天气大屏</h1>
              <span className="stats-page__brand-subtitle">STORM LEDGER</span>
            </div>
          </div>

          <div className="stats-page__headline-card stats-page__headline-card--city">
            <span className="stats-page__headline-pin" aria-hidden="true" />
            <div className="stats-page__headline-stack">
              <strong>{cityName}</strong>
              <span>
                {homeData.overview.location.adm1} {homeData.overview.location.adm2}
              </span>
            </div>
          </div>

          <div className="stats-page__headline-card stats-page__headline-card--time">
            <div className="stats-page__headline-time">
              <strong>{currentTimeMeta.dateText}</strong>
              <em>{currentTimeMeta.timeText}</em>
            </div>
            <div className="stats-page__headline-meta">
              <span>{currentTimeMeta.weekText}</span>
              <span>{currentTimeMeta.lunarText}</span>
            </div>
          </div>

          <div className="stats-page__headline-card">
            <div className="stats-page__headline-stack">
              <span>数据更新时间</span>
              <strong>{homeData.overview.weatherNow.obsTime ? homeData.overview.weatherNow.obsTime.slice(11, 16) : '--:--'}</strong>
            </div>
          </div>

          <div className="stats-page__headline-card stats-page__headline-card--weather">
            <WeatherIcon
              code={homeData.overview.weatherNow.icon}
              className="stats-page__headline-weather-icon"
              label={homeData.overview.weatherNow.text}
            />
            <div className="stats-page__headline-stack">
              <span>当前天气</span>
              <strong>
                {homeData.overview.weatherNow.text} {homeData.overview.weatherNow.temp}°C
              </strong>
            </div>
          </div>

          <div className="stats-page__headline-card stats-page__headline-card--aqi">
            <div className="stats-page__headline-stack">
              <span>AQI</span>
              <div className="stats-page__headline-value-line">
                <strong style={{ color: aqiColor }}>{homeData.airNow.aqi}</strong>
                <em className="stats-page__headline-badge" style={{ color: aqiColor }}>
                  {homeData.airNow.category}
                </em>
              </div>
            </div>
          </div>

          <div className="stats-page__headline-card stats-page__headline-card--alert">
            <div className="stats-page__headline-stack">
              <span>预警状态</span>
              <strong className={hasAlert ? 'stats-page__status stats-page__status--warning' : 'stats-page__status'}>
                {hasAlert
                  ? homeData.overview.alertSummary.highestSeverity
                    ? `${homeData.overview.alertSummary.highestSeverity}预警`
                    : `${homeData.overview.alertSummary.count}条预警`
                  : '无预警'}
              </strong>
            </div>
          </div>

          <button
            className="stats-page__back-button"
            onClick={() => navigate('/')}
            type="button"
          >
            <span aria-hidden="true">←</span>
            返回大屏
          </button>
        </header>

        <div className="stats-page__layout">
          <aside className="stats-page__sidebar">
            <section className="stats-page__sidebar-panel stats-page__sidebar-panel--nav">
              <div className="stats-page__sidebar-head">
                <span className="stats-page__sidebar-kicker">
                  <span className="stats-page__sidebar-kicker-icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" focusable="false">
                      <path
                        d="M4.5 10.8V7.8M7.9 10.8V5.6M11.2 10.8V6.8"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.35"
                      />
                      <path
                        d="m4.5 7.8 3.4-2.2 3.3 1.2"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.15"
                      />
                      <circle cx="4.5" cy="7.8" fill="currentColor" r="0.8" />
                      <circle cx="7.9" cy="5.6" fill="currentColor" r="0.8" />
                      <circle cx="11.2" cy="6.8" fill="currentColor" r="0.8" />
                      <path
                        d="M3.8 11.6h8.4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.1"
                      />
                    </svg>
                  </span>
                  <span>统计详情</span>
                </span>
                <h2 className="stats-page__sidebar-title">多维统计概览</h2>
              </div>

              <nav className="stats-page__nav" aria-label="统计详情分区导航">
                {SIDEBAR_ITEMS.map((item) => (
                  <button
                    className={`stats-page__nav-item${activeSection === item.id ? ' stats-page__nav-item--active' : ''}`}
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    type="button"
                  >
                    <span className="stats-page__nav-icon" aria-hidden="true">
                      {renderSidebarIcon(item.id)}
                    </span>
                    <span className="stats-page__nav-label">{getSidebarNavLabel(item.id)}</span>
                  </button>
                ))}
              </nav>
            </section>

            <section className="stats-page__city-card stats-page__city-card--sidebar">
              <div
                className="stats-page__city-cover"
                style={{ backgroundImage: `url(${cityPreviewImage})` }}
              />
              <div className="stats-page__city-copy">
                <strong>{cityName}</strong>
                <span>{adm1 || homeData.overview.location.adm1}</span>
              </div>
              <button
                className="stats-page__city-switch"
                onClick={() => navigate('/')}
                type="button"
              >
                切换城市
              </button>
            </section>
          </aside>

          <main className="stats-page__content">
            <section
              className="stats-page__section"
              data-section-id="trend"
              id="trend"
              ref={trendSectionRef}
            >
              <div className="stats-page__section-header">
                <div>
                  <h2 className="stats-page__section-title">近{trendRange}天趋势</h2>
                  <p className="stats-page__section-desc">
                    统计窗口：{trendWindowPeriod}，{trendCoverageText}
                  </p>
                </div>

                <div className="stats-page__filters" aria-label="趋势时间范围">
                  {TREND_OPTIONS.map((item) => (
                    <button
                      className={`stats-page__filter${trendRange === item.value ? ' stats-page__filter--active' : ''}${item.disabled ? ' stats-page__filter--disabled' : ''}`}
                      disabled={item.disabled}
                      key={item.label}
                      onClick={() => {
                        if (item.value) {
                          setTrendRange(item.value);
                        }
                      }}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stats-page__trend-grid">
                <article className="stats-page__panel stats-page__panel--temperature">
                  <div className="stats-page__panel-head">
                    <h3>近{trendRange}天温度趋势</h3>
                    <span>单位：°C · {trendCoverageText}</span>
                  </div>
                  <div className="stats-page__chart stats-page__chart--large">
                    <DashboardChart option={buildTemperatureOption(trendChartRecords)} />
                  </div>
                </article>

                <article className="stats-page__panel stats-page__panel--precipitation">
                  <div className="stats-page__panel-head">
                    <h3>近{trendRange}天降水趋势</h3>
                    <span>单位：mm · {trendCoverageText}</span>
                  </div>
                  <div className="stats-page__chart stats-page__chart--medium">
                    <DashboardChart option={buildPrecipitationOption(trendChartRecords)} />
                  </div>
                  <div className="stats-page__mini-stats">
                    {precipitationSummaryItems.map((item) => (
                      <div className="stats-page__mini-stat" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <em>{item.note}</em>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="stats-page__panel stats-page__panel--aqi">
                  <div className="stats-page__panel-head">
                    <h3>近{trendRange}天AQI趋势</h3>
                    <span>单位：AQI · {trendCoverageText}</span>
                  </div>
                  <div className="stats-page__chart stats-page__chart--medium">
                    <DashboardChart option={buildAqiOption(trendChartRecords)} />
                  </div>
                </article>

                <article
                  className="stats-page__panel stats-page__panel--ratio"
                  data-section-id="ratio"
                  id="ratio"
                  ref={ratioSectionRef}
                >
                  <div className="stats-page__panel-head">
                    <h3>近{trendRange}天天气类型占比</h3>
                    <span>统计样本 {displayedRecords.length} 天</span>
                  </div>
                    <div className="stats-page__ratio-layout">
                      <div className="stats-page__chart stats-page__chart--ratio">
                        <DashboardChart option={buildWeatherRatioOption(weatherRatios)} />
                      </div>
                      <div className="stats-page__ratio-legend" aria-label="天气类型占比明细">
                        <div className="stats-page__ratio-list">
                          {weatherRatios.map((item, index) => {
                            const ratioPercent = formatRatioPercent(item.ratio);
                            const themeColor = getWeatherRatioThemeColor(item.type, index);

                            return (
                              <div
                                className="stats-page__ratio-row"
                                key={item.type}
                                style={
                                  {
                                    '--stats-page-ratio-color': themeColor,
                                  } as CSSProperties
                                }
                              >
                                <div className="stats-page__ratio-label">
                                  <WeatherIcon
                                    code={resolveWeatherTypeIconCode(item.type)}
                                    className="stats-page__ratio-icon"
                                    label={item.type}
                                  />
                                  <span className="stats-page__ratio-name">{item.type}</span>
                                </div>
                                <span className="stats-page__ratio-days">{item.count}天</span>
                                <strong className="stats-page__ratio-percent">{ratioPercent}</strong>
                              </div>
                            );
                          })}
                        </div>
                        <p className="stats-page__ratio-footnote">统计基于日间主要天气现象</p>
                      </div>
                    </div>
                  </article>
              </div>
            </section>

            <div className="stats-page__detail-grid">
              <section
                className="stats-page__panel stats-page__panel--table"
                data-section-id="weekly"
                id="weekly"
                ref={weeklySectionRef}
              >
                <div className="stats-page__panel-head">
                  <h3>周统计明细</h3>
                  <span>
                    {statsDetail.weeklyStats.weekStart} ~ {statsDetail.weeklyStats.weekEnd}
                  </span>
                </div>

                <div className="stats-page__table">
                  <div className="stats-page__table-row stats-page__table-row--head">
                    <span>周次</span>
                    <span>日期范围</span>
                    <span>平均温度</span>
                    <span>最高/最低</span>
                    <span>降水(mm)</span>
                    <span>AQI</span>
                    <span>天气概况</span>
                  </div>

                  {weeklyRows.map((item) => (
                    <div className="stats-page__table-row" key={`${item.weekLabel}-${item.dateRange}`}>
                      <span>{item.weekLabel}</span>
                      <span>{item.dateRange}</span>
                      <span>{item.avgTemp}°C</span>
                      <span>
                        {item.maxTemp} / {item.minTemp}
                      </span>
                      <span>
                        {item.precipitation} / {item.rainyDays}天
                      </span>
                      <span>{item.aqiAvg}</span>
                      <span>
                        {item.weatherType} · {item.sampleText}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="stats-page__panel stats-page__panel--table"
                data-section-id="monthly"
                id="monthly"
                ref={monthlySectionRef}
              >
                <div className="stats-page__panel-head">
                  <h3>月统计明细</h3>
                  <span>{statsDetail.monthlyStats.month}</span>
                </div>

                <div className="stats-page__table">
                  <div className="stats-page__table-row stats-page__table-row--head">
                    <span>月份</span>
                    <span>平均温度</span>
                    <span>最高/最低</span>
                    <span>降水(mm)</span>
                    <span>雨天数</span>
                    <span>AQI</span>
                    <span>样本说明</span>
                  </div>

                  {monthlyRows.map((item) => (
                    <div className="stats-page__table-row" key={item.month}>
                      <span>{item.month}</span>
                      <span>{item.avgTemp}°C</span>
                      <span>
                        {item.maxTemp} / {item.minTemp}
                      </span>
                      <span>{item.precipitation}</span>
                      <span>{item.rainyDays}天</span>
                      <span>{item.aqiAvg}</span>
                      <span>{item.sampleText}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className="stats-page__panel stats-page__panel--notes"
                data-section-id="notes"
                id="notes"
                ref={notesSectionRef}
              >
                <div className="stats-page__panel-head">
                  <h3>数据说明</h3>
                  <span>当前月统计按最新采样日展示</span>
                </div>

                <div className="stats-page__notes">
                  {noteItems.map((item) => (
                    <div className="stats-page__note-row" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>
        </div>

        <footer className="stats-page__footer">
          <span>© 2026 Storm Ledger 城市环境与天气大屏</span>
          <span>本地时间：{currentTimeMeta.dateText} {currentTimeMeta.timeText}</span>
          <span>数据仅供参考，不作为决策依据</span>
        </footer>
      </div>
    </div>
  );
}
