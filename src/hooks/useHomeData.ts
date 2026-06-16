/**
 * @file 首页数据 Hook
 * @description 在定位完成后优先获取首页聚合数据，并在后台补充统计详情
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/request';
import { useCityStore } from '../stores/cityStore';
import type { HomeData, StatsDetailData } from '../types';

/** Hook 返回值 */
interface UseHomeDataResult {
  /** 首页聚合数据 */
  homeData: HomeData | null;
  /** 统计详情数据 */
  statsDetail: StatsDetailData | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重新获取数据 */
  refetch: () => void;
}

/**
 * 首页数据 Hook
 * @returns 首页所需数据、加载状态和重试方法
 */
export function useHomeData(): UseHomeDataResult {
  const locationId = useCityStore((state) => state.locationId);
  const isLocating = useCityStore((state) => state.isLocating);
  const requestIdRef = useRef(0);

  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [statsDetail, setStatsDetail] = useState<StatsDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取首页数据
   */
  const fetchData = useCallback(async () => {
    if (!locationId || isLocating) {
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    setLoading(true);
    setError(null);
    setStatsDetail(null);

    try {
      const homeResult = await api.getHomeData(locationId);

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setHomeData(homeResult);
      setLoading(false);

      void api
        .getStatsDetail(locationId)
        .then((statsResult) => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          setStatsDetail(statsResult);
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          setStatsDetail(null);
        });
    } catch (fetchError) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const message = fetchError instanceof Error ? fetchError.message : '首页数据加载失败';
      setError(message);
      setLoading(false);
    }
  }, [isLocating, locationId]);

  useEffect(() => {
    if (isLocating) {
      requestIdRef.current += 1;
      setLoading(true);
      return;
    }

    void fetchData();
  }, [fetchData, isLocating]);

  return {
    homeData,
    statsDetail,
    loading,
    error,
    refetch: fetchData,
  };
}
