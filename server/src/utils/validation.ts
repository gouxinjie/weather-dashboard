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
  const result = requiredString(locationId, 'locationId');
  if (!result.valid) return result;

  if (typeof locationId !== 'string' || !/^\d{9}$/.test(locationId)) {
    return {
      valid: false,
      errorCode: ErrorCodes.INVALID_LOCATION_ID,
      errorMessage: '无效的城市 ID 格式',
    };
  }
  return { valid: true, errorCode: ErrorCodes.INVALID_LOCATION_ID, errorMessage: '' };
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
