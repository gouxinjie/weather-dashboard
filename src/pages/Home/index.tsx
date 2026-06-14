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
  return [
    {
      label: '今日天气',
      value: homeData.overview.weatherNow.text,
      note: `${homeData.overview.todaySummary.tempMin}°/${homeData.overview.todaySummary.tempMax}°`,
      accent: 'amber',
    },
    {
      label: '本周平均气温',
      value: `${homeData.weeklyStats.avgTemp}°C`,
      note: `${homeData.weeklyStats.weekStart} 起`,
      accent: 'teal',
    },
    {
      label: '本周总降水',
      value: `${homeData.weeklyStats.totalPrecipitation} mm`,
      note: `雨天 ${homeData.weeklyStats.rainyDays} 天`,
      accent: 'blue',
    },
    {
      label: '本周 AQI 均值',
      value: homeData.weeklyStats.aqiAvg,
      note: `样本 ${homeData.weeklyStats.sampleDays}/${homeData.weeklyStats.expectedDays}`,
      accent: 'green',
    },
    {
      label: '本月平均气温',
      value: `${homeData.monthlyStats.avgTemp}°C`,
      note: '截至最新采样日',
      accent: 'amber',
    },
    {
      label: '本月累计降水',
      value: `${homeData.monthlyStats.totalPrecipitation} mm`,
      note: '截至最新采样日',
      accent: 'blue',
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
      text: matched?.text || '当前暂无该指数数据',
      icon: preset.icon,
      accent: preset.accent,
    };
  });

  return selected;
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
): string[] {
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

    return [
      `${maxTempDay.statDate.slice(5)} 最高气温 ${maxTempDay.maxTemp.toFixed(1)}°C`,
      `${minTempDay.statDate.slice(5)} 最低气温 ${minTempDay.minTemp.toFixed(1)}°C`,
      `${maxPrecipDay.statDate.slice(5)} 最大日降水 ${maxPrecipDay.precipitation.toFixed(1)}mm`,
      `本月样本期 ${source[0].statDate} 至 ${source[source.length - 1].statDate}`,
    ];
  }

  const hotDay = dailyForecast.reduce((prev, current) =>
    toNumber(current.tempMax) > toNumber(prev.tempMax) ? current : prev
  );
  const rainDay = dailyForecast.reduce((prev, current) =>
    toNumber(current.precip) > toNumber(prev.precip) ? current : prev
  );

  return [
    `${formatShortDate(hotDay.fxDate)} 预报最高气温 ${hotDay.tempMax}°C`,
    `${formatShortDate(rainDay.fxDate)} 预报降水 ${rainDay.precip}mm`,
    '近 30 天实测样本不足，以下提示以当前预报为参考',
  ];
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
function SummaryRow({ metric }: { metric: SummaryMetric }): JSX.Element {
  return (
    <div className={`weather-home__summary-row weather-home__summary-row--${metric.accent}`}>
      <span className="weather-home__summary-dot" />
      <div className="weather-home__summary-copy">
        <span className="weather-home__summary-label">{metric.label}</span>
        <span className="weather-home__summary-note">{metric.note}</span>
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
    const weatherRatios = homeData.monthlyStats.weatherTypeRatio.slice(0, 4);
    const recentSevenSeries = buildRecentSevenSeries(statsDetail, homeData.daily);
    const monthlyHighlights = buildMonthlyHighlights(statsDetail, homeData.daily);
    const hourlySample = sampleItems(homeData.hourly, 12);

    return {
      timeMeta,
      weatherScene,
      summaryMetrics,
      lifeIndices,
      weatherRatios,
      recentSevenSeries,
      monthlyHighlights,
      hourlySample,
      precipitationDelta: buildPrecipitationDelta(statsDetail),
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
            <div className="weather-home__headline-stack">
              <span>预警状态</span>
              <div className="weather-home__headline-value-line weather-home__headline-value-line--alert">
                <span
                  className={`weather-home__headline-alert-icon weather-home__headline-alert-icon--${hasAlert ? 'warning' : 'safe'}`}
                  style={alertIconStyle}
                  aria-hidden="true"
                >
                  {hasAlert ? '!' : '✓'}
                </span>
                <strong style={{ color: alertColor }}>
                  {hasAlert ? '有预警' : '无预警'}
                </strong>
                <em style={{ color: alertColor }}>
                  {homeData.overview.alertSummary.highestSeverity || '安全'}
                </em>
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
              <div className="weather-home__hero-skyline" />

              <div className="weather-home__hero-main">
                <div className="weather-home__hero-temp">
                  <span className="weather-home__hero-degree">
                    {toNumber(homeData.overview.weatherNow.temp).toFixed(1)}
                  </span>
                  <span className="weather-home__hero-unit">°C</span>
                </div>

                <div className="weather-home__hero-copy">
                  <div className="weather-home__hero-copy-line">
                    <WeatherIcon
                      code={homeData.overview.weatherNow.icon}
                      className="weather-home__hero-glyph"
                      label={homeData.overview.weatherNow.text}
                    />
                    <span>体感温度 {homeData.overview.weatherNow.feelsLike}°C</span>
                  </div>
                  <h2>{homeData.overview.weatherNow.text}</h2>
                  <p>{homeData.minutely.summary || '空气清新，当前天气稳定，注意合理安排出行。'}</p>
                </div>
              </div>

              <div className="weather-home__hero-metrics">
                <div>
                  <span>最高温度</span>
                  <strong>{homeData.overview.todaySummary.tempMax}°C</strong>
                </div>
                <div>
                  <span>最低温度</span>
                  <strong>{homeData.overview.todaySummary.tempMin}°C</strong>
                </div>
                <div>
                  <span>风向风力</span>
                  <strong>{homeData.overview.weatherNow.windDir} {homeData.overview.weatherNow.windScale}级</strong>
                </div>
                <div>
                  <span>湿度</span>
                  <strong>{homeData.overview.weatherNow.humidity}%</strong>
                </div>
                <div>
                  <span>能见度</span>
                  <strong>{homeData.overview.weatherNow.vis} km</strong>
                </div>
                <div>
                  <span>气压</span>
                  <strong>{homeData.overview.weatherNow.pressure} hPa</strong>
                </div>
                <div>
                  <span>当前降水量</span>
                  <strong>{homeData.overview.weatherNow.precip} mm</strong>
                </div>
                <div>
                  <span>紫外线强度</span>
                  <strong>{homeData.overview.todaySummary.uvIndex} 级</strong>
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
                    {homeData.airNow.level || homeData.airNow.category}
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
              <h2>近 30 天累计降水</h2>
              <span>单位: mm</span>
            </div>
            <div className="weather-home__precip-hero">
              <strong>{homeData.monthlyStats.totalPrecipitation}</strong>
              <em>mm</em>
            </div>
            <div className="weather-home__precip-wave" />
            <div className="weather-home__precip-footnote">
              <span>{viewModel.precipitationDelta}</span>
              <em>基于样本期前后半段对比</em>
            </div>
          </section>

          <section className="weather-home__panel weather-home__panel--bottom weather-home__panel--ratio-card">
            <div className="weather-home__panel-head">
              <h2>近 30 天天气类型占比</h2>
            </div>
            <div className="weather-home__ratio-chart">
              <DashboardChart option={buildWeatherRatioOption(homeData.monthlyStats.weatherTypeRatio)} />
            </div>
            <div className="weather-home__ratio-legend-list">
              {homeData.monthlyStats.weatherTypeRatio.slice(0, 4).map((item) => (
                <div className="weather-home__ratio-legend-row" key={item.type}>
                  <span>{item.type}</span>
                  <strong>{Math.round(item.ratio * 100)}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="weather-home__panel weather-home__panel--bottom weather-home__panel--highlights">
            <div className="weather-home__panel-head">
              <h2>本月极端天气提示</h2>
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
