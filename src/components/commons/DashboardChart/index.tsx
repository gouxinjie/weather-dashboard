/**
 * @component DashboardChart
 * @description ECharts 通用图表容器，负责实例初始化、更新和自适应
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import './index.scss';

/** Props 定义 */
interface DashboardChartProps {
  /** 图表配置，必填，默认值：无 */
  option: EChartsOption;
  /** 额外类名，非必填，默认值：空字符串 */
  className?: string;
}

/**
 * ECharts 通用图表组件
 * @param props 组件属性
 * @returns 图表容器
 */
export function DashboardChart({
  option,
  className = '',
}: DashboardChartProps): JSX.Element {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const instance = echarts.init(chartRef.current);
    instanceRef.current = instance;
    instance.setOption(option);

    const resizeObserver = new ResizeObserver(() => {
      instance.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      instance.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!instanceRef.current) {
      return;
    }

    instanceRef.current.setOption(option, true);
  }, [option]);

  return <div className={`dashboard-chart ${className}`.trim()} ref={chartRef} />;
}
