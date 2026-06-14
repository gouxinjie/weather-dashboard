/**
 * @file 城市状态管理
 * @description 使用 Zustand 管理当前选中城市状态
 */

import { create } from 'zustand';
import { STORAGE_KEYS, DEFAULT_LOCATION_ID, DEFAULT_CITY_NAME } from '../constants';

/** 城市状态接口 */
interface CityState {
  /** 当前城市 LocationID */
  locationId: string;
  /** 当前城市名称 */
  cityName: string;
  /** 城市所属省份 */
  adm1: string;
  /** 是否正在定位中 */
  isLocating: boolean;
  /** 定位是否失败 */
  locateFailed: boolean;
  /** 设置当前城市 */
  setCity: (locationId: string, cityName: string, adm1: string) => void;
  /** 从缓存恢复城市 */
  restoreFromCache: () => boolean;
  /** 设置定位状态 */
  setLocating: (isLocating: boolean) => void;
  /** 设置定位失败 */
  setLocateFailed: (failed: boolean) => void;
}

/**
 * 城市状态 Store
 * @description 管理当前城市的选择、缓存和定位状态
 */
export const useCityStore = create<CityState>((set) => ({
  locationId: DEFAULT_LOCATION_ID,
  cityName: DEFAULT_CITY_NAME,
  adm1: '',
  isLocating: true,
  locateFailed: false,

  setCity: (locationId: string, cityName: string, adm1: string) => {
    // 写入 localStorage 缓存
    localStorage.setItem(
      STORAGE_KEYS.RECENT_CITY,
      JSON.stringify({ locationId, cityName, adm1, timestamp: Date.now() })
    );
    set({ locationId, cityName, adm1, isLocating: false, locateFailed: false });
  },

  restoreFromCache: () => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.RECENT_CITY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          locationId: string;
          cityName: string;
          adm1: string;
          timestamp: number;
        };
        if (parsed.locationId && parsed.cityName) {
          set({
            locationId: parsed.locationId,
            cityName: parsed.cityName,
            adm1: parsed.adm1 || '',
            isLocating: false,
          });
          return true;
        }
      }
    } catch {
      // 缓存数据损坏，使用默认值
    }
    return false;
  },

  setLocating: (isLocating: boolean) => set({ isLocating }),
  setLocateFailed: (failed: boolean) => set({ locateFailed: failed, isLocating: false }),
}));
