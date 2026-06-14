/**
 * @file 定位 Hook
 * @description 处理浏览器地理定位、缓存恢复和超时兜底逻辑
 */

import { useEffect } from 'react';
import { api } from '../utils/request';
import { useCityStore } from '../stores/cityStore';

/** 定位等待超时时间（毫秒） */
const LOCATION_TIMEOUT_MS = 2500;

/**
 * 定位 Hook
 * @description 首次进入页面时优先尝试恢复缓存或解析浏览器位置，超时则回退默认城市
 */
export function useLocation(): void {
  const { restoreFromCache, setCity, setLocateFailed } = useCityStore();

  useEffect(() => {
    let resolved = false;
    let fallbackTimer = 0;

    /**
     * 结束定位流程
     * @param handler 结束时执行的处理逻辑
     */
    const finalize = (handler: () => void): void => {
      if (resolved) {
        return;
      }

      resolved = true;
      window.clearTimeout(fallbackTimer);
      handler();
    };

    // 优先从缓存恢复
    const cached = restoreFromCache();
    if (cached) {
      resolved = true;
      return;
    }

    // 若浏览器不支持定位，直接回退默认城市
    if (!navigator.geolocation) {
      finalize(() => {
        setLocateFailed(true);
      });
      return;
    }

    // 若定位长时间无响应，则结束 loading，直接使用默认城市
    fallbackTimer = window.setTimeout(() => {
      finalize(() => {
        setLocateFailed(true);
      });
    }, LOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          const city = await api.resolveCurrentCity(lat, lon);

          finalize(() => {
            setCity(city.id, city.name, city.adm1 || '');
          });
        } catch {
          finalize(() => {
            setLocateFailed(true);
          });
        }
      },
      () => {
        finalize(() => {
          setLocateFailed(true);
        });
      },
      { timeout: LOCATION_TIMEOUT_MS, enableHighAccuracy: false }
    );

    return () => {
      resolved = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [restoreFromCache, setCity, setLocateFailed]);
}
