/**
 * @component AirQualityCard
 * @description 空气质量模块 - 展示 AQI 和各项污染物指标
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { AirNow, AirHourlyItem } from '../../../types';
import { AQI_CATEGORY_COLORS } from '../../../constants';
import './index.scss';

/** Props 定义 */
interface AirQualityCardProps {
  /** 实时空气质量数据 */
  airNow: AirNow;
  /** 空气质量小时趋势数据 */
  airHourly?: AirHourlyItem[];
}

/**
 * 空气质量模块组件
 * @description 展示 AQI 等级、首要污染物、各项指标和 24 小时趋势
 */
export function AirQualityCard({ airNow, airHourly }: AirQualityCardProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const aqiColor = AQI_CATEGORY_COLORS[airNow.category] || '#9DA5A6';
  const aqiNum = parseInt(airNow.aqi, 10) || 0;
  const aqiPercent = Math.min(aqiNum / 500 * 100, 100);

  // 渲染 AQI 趋势图
  useEffect(() => {
    if (!chartRef.current || !airHourly || airHourly.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const hours = airHourly.map((item) => {
      const match = item.fxTime.match(/T(\d{2}):/);
      return match ? `${match[1]}:00` : item.fxTime;
    });
    const aqis = airHourly.map((item) => parseFloat(item.aqi) || 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#171D21',
        borderColor: '#283138',
        textStyle: { color: '#F2E9D8', fontSize: 12 },
      },
      grid: {
        top: 5,
        right: 10,
        bottom: 5,
        left: 40,
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          color: '#9DA5A6',
          fontSize: 9,
          interval: 3,
        },
        axisLine: { lineStyle: { color: '#283138' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9DA5A6', fontSize: 9 },
        splitLine: { lineStyle: { color: '#283138', type: 'dashed' } },
      },
      series: [
        {
          name: 'AQI',
          type: 'line',
          data: aqis,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: aqiColor, width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: aqiColor.replace(')', ', 0.2)').replace('rgb', 'rgba') },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ]),
          },
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [airHourly, aqiColor]);

  const pollutants = [
    { label: 'PM2.5', value: airNow.pm2p5, unit: 'μg/m³' },
    { label: 'PM10', value: airNow.pm10, unit: 'μg/m³' },
    { label: 'NO₂', value: airNow.no2, unit: 'μg/m³' },
    { label: 'SO₂', value: airNow.so2, unit: 'μg/m³' },
    { label: 'O₃', value: airNow.o3, unit: 'μg/m³' },
    { label: 'CO', value: airNow.co, unit: 'mg/m³' },
  ];

  return (
    <div className="air-quality-card">
      <h3 className="air-quality-card__title">空气质量</h3>

      {/* AQI 圆环 */}
      <div className="air-quality-card__aqi-ring" style={{ borderColor: aqiColor }}>
        <span className="air-quality-card__aqi-value" style={{ color: aqiColor }}>
          {airNow.aqi}
        </span>
        <span className="air-quality-card__aqi-label" style={{ color: aqiColor }}>
          {airNow.category}
        </span>
      </div>

      {/* 进度条 */}
      <div className="air-quality-card__bar-track">
        <div
          className="air-quality-card__bar-fill"
          style={{ width: `${aqiPercent}%`, backgroundColor: aqiColor }}
        />
      </div>

      {/* 首要污染物 */}
      {airNow.primaryPollutant && (
        <div className="air-quality-card__primary">
          首要污染物：{airNow.primaryPollutant}
        </div>
      )}

      {/* 污染物指标 */}
      <div className="air-quality-card__pollutants">
        {pollutants.map((p) => (
          <div className="air-quality-card__pollutant" key={p.label}>
            <span className="air-quality-card__pollutant-label">{p.label}</span>
            <span className="air-quality-card__pollutant-value">
              {p.value} <small>{p.unit}</small>
            </span>
          </div>
        ))}
      </div>

      {/* AQI 趋势 */}
      {airHourly && airHourly.length > 0 && (
        <div className="air-quality-card__trend">
          <span className="air-quality-card__trend-label">24h AQI 趋势</span>
          <div className="air-quality-card__trend-chart" ref={chartRef} />
        </div>
      )}
    </div>
  );
}
