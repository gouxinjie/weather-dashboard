/**
 * @component CityDrawer
 * @description 城市选择抽屉 - 城市搜索、定位城市、最近访问、热门城市
 * @author
 * @created 2026-06-13
 * @updated 2026-06-13
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../utils/request';
import { useCityStore } from '../../../stores/cityStore';
import { HOT_CITIES, STORAGE_KEYS } from '../../../constants';
import type { CityInfo } from '../../../types';
import './index.scss';

/** Props 定义 */
interface CityDrawerProps {
  /** 是否打开抽屉 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/** 最近访问城市类型 */
interface RecentCityRecord {
  id: string;
  name: string;
  adm1: string;
  accessedAt: number;
}

/**
 * 城市选择抽屉组件
 * @description 支持搜索城市、选择定位城市、热门城市和最近访问城市
 */
export function CityDrawer({ open, onClose }: CityDrawerProps): JSX.Element {
  const { locationId, cityName, setCity } = useCityStore();
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<CityInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentCities, setRecentCities] = useState<RecentCityRecord[]>([]);

  // 加载最近访问城市
  useEffect(() => {
    if (!open) return;
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.RECENT_CITIES);
      if (cached) {
        setRecentCities(JSON.parse(cached));
      }
    } catch {
      // 忽略解析错误
    }
  }, [open]);

  // 搜索防抖
  const handleSearch = useCallback(async (kw: string) => {
    setKeyword(kw);
    if (kw.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const result = await api.searchCities(kw.trim());
      setSearchResults(result.list || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // 选择城市
  const handleSelectCity = useCallback(
    (city: { id: string; name: string; adm1: string }) => {
      setCity(city.id, city.name, city.adm1 || '');

      // 更新最近访问城市列表
      const newRecent: RecentCityRecord[] = [
        { id: city.id, name: city.name, adm1: city.adm1 || '', accessedAt: Date.now() },
        ...recentCities.filter((c) => c.id !== city.id),
      ].slice(0, 10);
      setRecentCities(newRecent);
      localStorage.setItem(STORAGE_KEYS.RECENT_CITIES, JSON.stringify(newRecent));

      setKeyword('');
      setSearchResults([]);
      onClose();
    },
    [setCity, recentCities, onClose]
  );

  // 回到当前定位
  const handleLocateCurrent = useCallback(async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude.toFixed(6);
          const lon = position.coords.longitude.toFixed(6);
          const city = await api.resolveCurrentCity(lat, lon);
          handleSelectCity({ id: city.id, name: city.name, adm1: city.adm1 || '' });
        } catch {
          // 定位失败静默处理
        }
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, [handleSelectCity]);

  if (!open) return <></>;

  return (
    <div className="city-drawer-overlay" onClick={onClose} role="presentation">
      <div
        className="city-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="城市选择"
      >
        <div className="city-drawer__header">
          <h2 className="city-drawer__title">选择城市</h2>
          <button className="city-drawer__close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* 搜索框 */}
        <div className="city-drawer__search">
          <input
            className="city-drawer__search-input"
            type="text"
            placeholder="搜索城市..."
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searching && <span className="city-drawer__search-spinner" />}
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="city-drawer__results">
            {searchResults.map((city) => (
              <div
                className="city-drawer__result-item"
                key={city.id}
                onClick={() => handleSelectCity(city)}
                role="button"
                tabIndex={0}
              >
                <span className="city-drawer__result-name">{city.name}</span>
                <span className="city-drawer__result-adm">
                  {city.adm1} {city.adm2}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 当前定位城市 */}
        <div className="city-drawer__section">
          <div className="city-drawer__section-header">
            <span className="city-drawer__section-title">📍 当前定位</span>
            <button
              className="city-drawer__locate-btn"
              onClick={handleLocateCurrent}
              type="button"
            >
              重新定位
            </button>
          </div>
          <div className="city-drawer__current-city">
            {locationId && (
              <span className="city-drawer__current-name">{cityName}</span>
            )}
          </div>
        </div>

        {/* 最近访问城市 */}
        {recentCities.length > 0 && (
          <div className="city-drawer__section">
            <div className="city-drawer__section-header">
              <span className="city-drawer__section-title">🕐 最近访问</span>
            </div>
            <div className="city-drawer__city-grid">
              {recentCities.map((city) => (
                <div
                  className={`city-drawer__city-tag ${city.id === locationId ? 'active' : ''}`}
                  key={city.id}
                  onClick={() => handleSelectCity(city)}
                  role="button"
                  tabIndex={0}
                >
                  {city.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 热门城市 */}
        <div className="city-drawer__section">
          <div className="city-drawer__section-header">
            <span className="city-drawer__section-title">🔥 热门城市</span>
          </div>
          <div className="city-drawer__city-grid">
            {HOT_CITIES.map((city) => (
              <div
                className={`city-drawer__city-tag ${city.id === locationId ? 'active' : ''}`}
                key={city.id}
                onClick={() => handleSelectCity(city)}
                role="button"
                tabIndex={0}
              >
                {city.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
