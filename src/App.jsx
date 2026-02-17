import { useState, useMemo } from 'react';
import MapView from './components/Map/MapView';
import AddressInput from './components/Controls/AddressInput';
import StoreList from './components/Controls/StoreList';
import RouteSummary from './components/RoutePanel/RouteSummary';
import SubwayInstructions from './components/RoutePanel/SubwayInstructions';
import POIAnalysis from './components/Analysis/POIAnalysis';
import LocationScore from './components/Analysis/LocationScore';
import TrafficChart from './components/Analysis/TrafficChart';
import { useStores } from './hooks/useStores';
import { useRoute } from './hooks/useRoute';
import { useCompetitors } from './hooks/useCompetitors';
import { usePOI } from './hooks/usePOI';
import { useSubway } from './hooks/useSubway';
import { calculateFootTrafficScore, generateHeatmapData } from './services/heatmap';
import { analyzePOIDistribution } from './services/poi';
import { calculateLocationScore, generateDailyTrafficData, generateWeeklyPattern } from './services/scoring';

function App() {
  const {
    stores,
    currentLocation,
    isLoading,
    error,
    addStore,
    removeStore,
    updateCurrentLocation,
    getCurrentPosition
  } = useStores();

  const {
    optimizedRoute,
    routeStats,
    isOptimizing,
    recalculateRoute
  } = useRoute(currentLocation, stores);

  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showSubway, setShowSubway] = useState(false);
  const [showPOIZones, setShowPOIZones] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const {
    competitors,
    isLoading: competitorsLoading,
    refreshCompetitors
  } = useCompetitors(stores, showCompetitors);

  const {
    pois,
    analysis,
    insights,
    isLoading: poisLoading,
    refreshPOIs,
    getPOIsNearStore
  } = usePOI(stores, showPOIZones);

  const {
    subwayRoutes,
    nearbyStations,
    isCalculating: subwayCalculating,
    getNearestStation
  } = useSubway(currentLocation, stores, optimizedRoute);

  // Calculate foot traffic score
  const footTrafficScore = useMemo(() => {
    if (!pois || pois.length === 0 || !currentLocation) return 0;
    return calculateFootTrafficScore(pois, currentLocation.coordinates.lat, currentLocation.coordinates.lng);
  }, [pois, currentLocation]);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    if (!showHeatmap || !currentLocation || pois.length === 0) return [];
    return generateHeatmapData(
      currentLocation.coordinates.lat,
      currentLocation.coordinates.lng,
      pois,
      500
    );
  }, [showHeatmap, currentLocation, pois]);

  // Generate POI analysis by store
  const poiAnalysisByStore = useMemo(() => {
    if (!pois || pois.length === 0) return {};

    const result = {};
    stores.forEach(store => {
      const storePOIs = getPOIsNearStore(store.id);
      if (storePOIs && storePOIs.length > 0) {
        result[store.id] = analyzePOIDistribution(storePOIs);
      }
    });
    return result;
  }, [stores, pois, getPOIsNearStore]);

  // Resolve selected store (default to first store)
  const selectedStore = useMemo(() => {
    if (!stores.length) return null;
    return stores.find(s => s.id === selectedStoreId) || stores[0];
  }, [stores, selectedStoreId]);

  // POIs near the selected store
  const selectedStorePOIs = useMemo(() => {
    if (!selectedStore) return [];
    return getPOIsNearStore(selectedStore.id) || [];
  }, [selectedStore, getPOIsNearStore, pois]);

  // Competitors near the selected store (within ~322m / 0.2 miles)
  const selectedStoreCompetitors = useMemo(() => {
    if (!selectedStore || !competitors.length) return [];
    return competitors.filter(c => {
      if (!c.coordinates) return false;
      const dlat = (c.coordinates.lat - selectedStore.coordinates.lat) * 111000;
      const dlng = (c.coordinates.lng - selectedStore.coordinates.lng) * 85000;
      return Math.sqrt(dlat * dlat + dlng * dlng) <= 322;
    });
  }, [selectedStore, competitors]);

  // Comprehensive investment score for selected store (real MTA data via storeLat/storeLng)
  const scoreResult = useMemo(() => {
    if (!showScoring || !selectedStore) return null;
    return calculateLocationScore({
      pois: selectedStorePOIs,
      competitors: selectedStoreCompetitors,
      storeLat: selectedStore.coordinates.lat,
      storeLng: selectedStore.coordinates.lng
    });
  }, [showScoring, selectedStore, selectedStorePOIs, selectedStoreCompetitors]);

  // Daily and weekly traffic data — pass mtaInfo from scoreResult for real ridership scaling
  const dailyTraffic = useMemo(() => {
    if (!showScoring || !selectedStore) return [];
    return generateDailyTrafficData(selectedStorePOIs, false, scoreResult?.mtaInfo ?? null);
  }, [showScoring, selectedStore, selectedStorePOIs, scoreResult]);

  const weeklyPattern = useMemo(() => {
    if (!showScoring || !selectedStore) return [];
    return generateWeeklyPattern(selectedStorePOIs, scoreResult?.mtaInfo ?? null);
  }, [showScoring, selectedStore, selectedStorePOIs, scoreResult]);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>SmartSite</h1>
          <p>Expansion Intelligence — Cotti Coffee NYC</p>
        </div>

        <div className="sidebar-content">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Current Location Input */}
          <div className="card">
            <div className="card-header">📍 当前位置</div>
            <AddressInput
              placeholder="输入您的当前位置"
              buttonText="设置位置"
              onSubmit={updateCurrentLocation}
              isLoading={isLoading}
            />
            <button
              className="btn btn-secondary btn-sm btn-block mt-1"
              onClick={getCurrentPosition}
              disabled={isLoading}
            >
              {isLoading ? '定位中...' : '使用我的位置'}
            </button>
            {currentLocation && (
              <div className="alert alert-success mt-1">
                <small>当前位置: {currentLocation.displayAddress || currentLocation.address}</small>
              </div>
            )}
          </div>

          {/* Add Store */}
          <div className="card">
            <div className="card-header">🏪 添加店铺</div>
            <AddressInput
              placeholder="输入店铺地址"
              buttonText="添加店铺"
              onSubmit={(address) => addStore(address)}
              isLoading={isLoading}
              disabled={!currentLocation}
            />
            {!currentLocation && (
              <div className="alert alert-warning mt-1">
                <small>请先设置当前位置</small>
              </div>
            )}
          </div>

          {/* Route Summary */}
          {routeStats && optimizedRoute.length > 0 && (
            <RouteSummary
              routeStats={routeStats}
              isOptimizing={isOptimizing}
              onRecalculate={recalculateRoute}
            />
          )}

          {/* Subway Instructions */}
          {showSubway && subwayRoutes && subwayRoutes.length > 0 && (
            <SubwayInstructions
              subwayRoutes={subwayRoutes}
              isCalculating={subwayCalculating}
            />
          )}

          {/* POI Analysis */}
          {showPOIZones && analysis && (
            <POIAnalysis
              analysis={analysis}
              insights={insights}
              footTrafficScore={footTrafficScore}
              isLoading={poisLoading}
            />
          )}

          {/* Feature Controls */}
          {stores.length > 0 && (
            <div className="card">
              <div className="card-header">🔧 功能控制</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  className={`btn btn-sm ${showCompetitors ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowCompetitors(!showCompetitors)}
                  disabled={competitorsLoading}
                >
                  {competitorsLoading ? '⏳' : showCompetitors ? '✓ 竞品' : '☕ 竞品'}
                </button>
                <button
                  className={`btn btn-sm ${showSubway ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowSubway(!showSubway)}
                >
                  {showSubway ? '✓ 地铁' : '🚇 地铁'}
                </button>
                <button
                  className={`btn btn-sm ${showPOIZones ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowPOIZones(!showPOIZones)}
                  disabled={poisLoading}
                >
                  {poisLoading ? '⏳' : showPOIZones ? '✓ 业态' : '📊 业态'}
                </button>
                <button
                  className={`btn btn-sm ${showHeatmap ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  {showHeatmap ? '✓ 热力图' : '🔥 热力图'}
                </button>
                <button
                  className={`btn btn-sm ${showScoring ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowScoring(!showScoring)}
                  style={{ gridColumn: '1 / -1' }}
                >
                  {showScoring ? '✓ 选址评分 & 人流监控' : '⭐ 选址评分 & 人流监控'}
                </button>
              </div>

              {/* Store selector for scoring */}
              {showScoring && stores.length > 1 && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                    选择评分店铺：
                  </label>
                  <select
                    className="form-input"
                    style={{ fontSize: '12px', padding: '6px 8px' }}
                    value={selectedStoreId || (stores[0]?.id ?? '')}
                    onChange={e => setSelectedStoreId(e.target.value)}
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.displayAddress || s.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Location Score Panel */}
          {showScoring && selectedStore && (
            <LocationScore
              scoreResult={scoreResult}
              storeName={selectedStore.name || selectedStore.displayAddress || selectedStore.address}
              isLoading={poisLoading}
            />
          )}

          {/* Traffic Chart Panel */}
          {showScoring && selectedStore && dailyTraffic.length > 0 && (
            <TrafficChart
              dailyTraffic={dailyTraffic}
              weeklyPattern={weeklyPattern}
              storeName={selectedStore.name || selectedStore.displayAddress || selectedStore.address}
            />
          )}

          {/* Store List */}
          {stores.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span>📋 店铺列表 ({stores.length})</span>
              </div>
              <StoreList
                stores={optimizedRoute.length > 0 ? optimizedRoute : stores}
                onRemoveStore={removeStore}
                showOrder={optimizedRoute.length > 0}
              />
            </div>
          )}

          {/* Empty State */}
          {stores.length === 0 && currentLocation && (
            <div className="alert alert-info">
              <p><strong>开始使用：</strong></p>
              <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>在上方输入店铺地址</li>
                <li>点击"添加店铺"</li>
                <li>系统会自动优化路线</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="map-container">
        <MapView
          currentLocation={currentLocation}
          stores={stores}
          optimizedRoute={optimizedRoute}
          showCompetitors={showCompetitors}
          competitors={competitors}
          showSubway={showSubway}
          nearbyStations={nearbyStations}
          showPOIZones={showPOIZones}
          poiAnalysisByStore={poiAnalysisByStore}
          showHeatmap={showHeatmap}
          heatmapData={heatmapData}
        />

        {/* Competitor Info Overlay */}
        {showCompetitors && competitors.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            zIndex: 1000
          }}>
            <strong>竞品统计</strong>
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              发现 <strong style={{ color: '#2563EB' }}>{competitors.length}</strong> 家竞品咖啡店
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
