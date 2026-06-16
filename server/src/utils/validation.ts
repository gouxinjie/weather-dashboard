/**
 * @file 参数校验工具
 * @description 统一的请求参数校验
 */

import type { ErrorCode } from '../types';
import { ErrorCodes } from '../types';

/** 校验结果 */
interface ValidationResult {
  valid: boolean;
  errorCode: ErrorCode;
  errorMessage: string;
}

/** locationId 解析结果 */
interface LocationIdValidationResult extends ValidationResult {
  value: string | null;
}

/**
 * 校验必填字符串参数
 * @param value 参数值
 * @param name 参数名
 * @returns 校验结果
 */
export function requiredString(value: unknown, name: string): ValidationResult {
  if (value === undefined || value === null || value === '') {
    return {
      valid: false,
      errorCode: ErrorCodes.INVALID_PARAMS,
      errorMessage: `参数 "${name}" 是必填项`,
    };
  }
  return { valid: true, errorCode: ErrorCodes.INVALID_PARAMS, errorMessage: '' };
}

/**
 * 校验 locationId 格式
 * @param locationId 城市 LocationID
 * @returns 校验结果
 */
export function validateLocationId(locationId: unknown): ValidationResult {
  const result = parseLocationId(locationId);
  return {
    valid: result.valid,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
  };
}

/**
 * 解析并校验 locationId
 * @param locationId 城市 LocationID
 * @returns 校验结果与规范化后的 LocationID
 */
export function parseLocationId(locationId: unknown): LocationIdValidationResult {
  const result = requiredString(locationId, 'locationId');
  if (!result.valid) {
    return {
      ...result,
      value: null,
    };
  }

  if (typeof locationId !== 'string') {
    return {
      valid: false,
      errorCode: ErrorCodes.INVALID_LOCATION_ID,
      errorMessage: '无效的城市 LocationID 格式',
      value: null,
    };
  }

  const normalizedLocationId = locationId.trim();

  // 和风天气的 LocationID 既可能是 9 位数字，也可能是字母数字混合 ID
  if (!/^[A-Za-z0-9]{4,20}$/.test(normalizedLocationId)) {
    return {
      valid: false,
      errorCode: ErrorCodes.INVALID_LOCATION_ID,
      errorMessage: '无效的城市 LocationID 格式',
      value: null,
    };
  }

  return {
    valid: true,
    errorCode: ErrorCodes.INVALID_LOCATION_ID,
    errorMessage: '',
    value: normalizedLocationId,
  };
}

/**
 * 校验坐标参数
 * @param lat 纬度
 * @param lon 经度
 * @returns 校验结果
 */
export function validateCoordinates(lat: unknown, lon: unknown): ValidationResult {
  const latResult = requiredString(lat, 'lat');
  if (!latResult.valid) return latResult;

  const lonResult = requiredString(lon, 'lon');
  if (!lonResult.valid) return lonResult;

  const latNum = parseFloat(lat as string);
  const lonNum = parseFloat(lon as string);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return {
      valid: false,
      errorCode: ErrorCodes.INVALID_COORDINATES,
      errorMessage: '无效的纬度值，范围应为 -90 到 90',
    };
  }

  if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
    return {
      valid: false,
      errorCode: ErrorCodes.INVALID_COORDINATES,
      errorMessage: '无效的经度值，范围应为 -180 到 180',
    };
  }

  return { valid: true, errorCode: ErrorCodes.INVALID_COORDINATES, errorMessage: '' };
}
