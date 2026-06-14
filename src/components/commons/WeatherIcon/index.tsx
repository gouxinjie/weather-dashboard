/**
 * @component WeatherIcon
 * @description 基于和风天气官方字体图标的统一渲染组件
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { normalizeWeatherIconCode } from '../../../utils/weatherIcon';
import './index.scss';

/** 图标样式变体 */
type WeatherIconVariant = 'outline' | 'fill';

/** Props 定义 */
interface WeatherIconProps {
  /** 类型：string | number | null | undefined；含义：和风天气图标编码；是否必填：是；默认值：999 */
  code: string | number | null | undefined;
  /** 类型：WeatherIconVariant；含义：是否使用填充版图标；是否必填：否；默认值：outline */
  variant?: WeatherIconVariant;
  /** 类型：string | undefined；含义：追加的样式类名；是否必填：否；默认值：undefined */
  className?: string;
  /** 类型：string | undefined；含义：无障碍文本，传入后按图片语义输出；是否必填：否；默认值：undefined */
  label?: string;
}

/**
 * 和风天气图标组件
 * @description 根据接口返回的 icon 编码直接生成官方字体图标类名
 */
export function WeatherIcon({
  code,
  variant = 'outline',
  className,
  label,
}: WeatherIconProps): JSX.Element {
  const normalizedCode = normalizeWeatherIconCode(code);
  const iconClassName = [
    'weather-icon',
    `qi-${normalizedCode}${variant === 'fill' ? '-fill' : ''}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (label) {
    return <i className={iconClassName} role="img" aria-label={label} />;
  }

  return <i className={iconClassName} aria-hidden="true" />;
}
