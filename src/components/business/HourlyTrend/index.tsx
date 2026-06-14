/**
 * @component HourlyTrend
 * @description 24 小时天气趋势图
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import type { HourlyItem } from '../../../types';
import './index.scss';

/** Props 定义 */
interface HourlyTrendProps {
  /** 逐小时天气数据列表 */
  data: HourlyItem[];
}

/**
 * 24 小时天气趋势组件
 * @description 使用 ECharts 展示 24 小时温度折线和降水概率柱图
 */
export function HourlyTrend({ data }: HourlyTrendProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const hours = data.map((item) => {
      const match = item.fxTime.match(/T(\d{2}):/);
      return match ? `${match[1]}:00` : item.fxTime;
    });
    const temps = data.map((item) => parseFloat(item.temp) || 0);
    const pops = data.map((item) => parseFloat(item.pop) || 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#171D21',
        borderColor: '#283138',
        textStyle: { color: '#F2E9D8', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#9DA5A6', fontSize: 11 },
      },
      grid: {
        top: 10,
        right: 10,
        bottom: 30,
        left: 40,
      },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: {
          color: '#9DA5A6',
          fontSize: 10,
          interval: 3,
        },
        axisLine: { lineStyle: { color: '#283138' } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '°C',
          nameTextStyle: { color: '#9DA5A6', fontSize: 10 },
          axisLabel: { color: '#9DA5A6', fontSize: 10 },
          splitLine: { lineStyle: { color: '#283138', type: 'dashed' } },
        },
        {
          type: 'value',
          name: '%',
          max: 100,
          nameTextStyle: { color: '#9DA5A6', fontSize: 10 },
          axisLabel: { color: '#9DA5A6', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '温度',
          type: 'line',
          data: temps,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#F4B942', width: 2 },
          itemStyle: { color: '#F4B942' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(244, 185, 66, 0.2)' },
              { offset: 1, color: 'rgba(244, 185, 66, 0.02)' },
            ]),
          },
        },
        {
          name: '降水概率',
          type: 'bar',
          yAxisIndex: 1,
          data: pops,
          barWidth: 6,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#4FA3A5' },
              { offset: 1, color: 'rgba(79, 163, 165, 0.3)' },
            ]),
            borderRadius: [3, 3, 0, 0],
          },
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return (
    <div className="hourly-trend">
      <h3 className="hourly-trend__title">24 小时趋势</h3>
      <div className="hourly-trend__chart" ref={chartRef} />
    </div>
  );
}
