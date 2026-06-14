/**
 * @file 天气图标工具
 * @description 提供和风天气图标编码归一化、场景归类与天气类型兜底映射
 */

/** 默认天气图标编码 */
const DEFAULT_WEATHER_ICON_CODE = '999';

/**
 * 归一化天气图标编码
 * @param code 类型：string | number | null | undefined；含义：和风天气接口返回的图标编码；是否必填：否；默认值：999
 * @returns 标准化后的图标编码
 * @throws 无显式异常，非法输入时返回默认编码
 */
export function normalizeWeatherIconCode(
  code: string | number | null | undefined
): string {
  if (typeof code === 'number' && Number.isFinite(code)) {
    return String(Math.trunc(code));
  }

  if (typeof code !== 'string') {
    return DEFAULT_WEATHER_ICON_CODE;
  }

  const normalized = code.trim().replace(/-fill$/, '');

  return /^\d+$/.test(normalized) ? normalized : DEFAULT_WEATHER_ICON_CODE;
}

/**
 * 解析天气主视觉场景
 * @param code 类型：string | number | null | undefined；含义：和风天气图标编码；是否必填：否；默认值：999
 * @returns 页面主视觉场景类型
 * @throws 无显式异常，非法输入时回退为 cloudy
 */
export function resolveWeatherScene(
  code: string | number | null | undefined
): 'sunny' | 'rainy' | 'misty' | 'cloudy' {
  const normalizedCode = normalizeWeatherIconCode(code);
  const iconCode = Number.parseInt(normalizedCode, 10);

  if ([100, 102, 103, 150, 152, 153].includes(iconCode)) {
    return 'sunny';
  }

  if ((iconCode >= 300 && iconCode < 500) || iconCode === 901) {
    return 'rainy';
  }

  if (iconCode >= 500 && iconCode < 600) {
    return 'misty';
  }

  return 'cloudy';
}

/**
 * 根据天气类型文本推断图标编码
 * @param typeText 类型：string；含义：统计口径中的天气类型文本；是否必填：是；默认值：无
 * @returns 对应的和风天气图标编码
 * @throws 无显式异常，无法识别时返回通用多云图标
 */
export function resolveWeatherTypeIconCode(typeText: string): string {
  const normalizedText = typeText.trim();

  if (!normalizedText) {
    return '101';
  }

  if (/雷/.test(normalizedText)) {
    return '302';
  }

  if (/冰雹/.test(normalizedText)) {
    return '304';
  }

  if (/雨夹雪|冻雨/.test(normalizedText)) {
    return '404';
  }

  if (/雪/.test(normalizedText)) {
    return '400';
  }

  if (/沙|尘/.test(normalizedText)) {
    return '507';
  }

  if (/雾/.test(normalizedText)) {
    return '500';
  }

  if (/霾/.test(normalizedText)) {
    return '502';
  }

  if (/雨/.test(normalizedText)) {
    return '306';
  }

  if (/晴/.test(normalizedText)) {
    return '100';
  }

  if (/阴/.test(normalizedText)) {
    return '104';
  }

  if (/云/.test(normalizedText)) {
    return '101';
  }

  return '101';
}
