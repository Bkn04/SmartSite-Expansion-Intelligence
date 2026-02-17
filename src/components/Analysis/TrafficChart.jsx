import { useState } from 'react';

const HOURS_TO_SHOW = [0, 3, 6, 9, 12, 15, 18, 21];

function Bar({ point, maxVisitors, currentHour }) {
  const heightPct = (point.visitors / (maxVisitors || 1)) * 100;
  const isNow = parseInt(point.hour) === currentHour;
  const barColor = point.isPeak
    ? '#EF4444'
    : isNow
    ? '#8B5CF6'
    : '#3B82F6';

  return (
    <div className="chart-bar-wrapper" title={`${point.hour} — ${point.visitors}人 ${point.label}`}>
      <div className="chart-bar-track">
        <div
          className="chart-bar-fill"
          style={{
            height: `${heightPct}%`,
            backgroundColor: barColor,
            opacity: isNow ? 1 : 0.75
          }}
        />
        {isNow && <div className="chart-bar-now-dot" />}
      </div>
      {HOURS_TO_SHOW.includes(parseInt(point.hour)) && (
        <span className="chart-bar-label">{point.hour.replace(':00', '')}</span>
      )}
    </div>
  );
}

function WeeklyBar({ day, maxVisitors }) {
  const heightPct = (day.visitors / (maxVisitors || 1)) * 100;
  return (
    <div className="chart-bar-wrapper" title={`${day.day} — ${day.visitors}人`}>
      <div className="chart-bar-track">
        <div
          className="chart-bar-fill"
          style={{
            height: `${heightPct}%`,
            backgroundColor: day.isWeekend ? '#F59E0B' : '#3B82F6',
            opacity: 0.8
          }}
        />
      </div>
      <span className="chart-bar-label">{day.day}</span>
    </div>
  );
}

function TrafficChart({ dailyTraffic = [], weeklyPattern = [], storeName }) {
  const [view, setView] = useState('daily'); // 'daily' | 'weekly'
  const currentHour = new Date().getHours();

  const daily = dailyTraffic || [];
  const weekly = weeklyPattern || [];

  const maxDaily = Math.max(...daily.map(d => d.visitors), 1);
  const maxWeekly = Math.max(...weekly.map(d => d.visitors), 1);

  const peakHours = daily.filter(d => d.isPeak).map(d => d.hour.replace(':00', ':00'));
  const todayVisitors = daily[currentHour]?.visitors || 0;

  if (daily.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📈 人流量监控 — {storeName}</span>
        <div className="chart-toggle">
          <button
            className={`toggle-btn ${view === 'daily' ? 'active' : ''}`}
            onClick={() => setView('daily')}
          >日</button>
          <button
            className={`toggle-btn ${view === 'weekly' ? 'active' : ''}`}
            onClick={() => setView('weekly')}
          >周</button>
        </div>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {view === 'daily' ? (
          <>
            <span className="legend-dot" style={{ background: '#EF4444' }} /> 高峰
            <span className="legend-dot" style={{ background: '#8B5CF6' }} /> 当前时刻
            <span className="legend-dot" style={{ background: '#3B82F6' }} /> 其他时段
          </>
        ) : (
          <>
            <span className="legend-dot" style={{ background: '#3B82F6' }} /> 工作日
            <span className="legend-dot" style={{ background: '#F59E0B' }} /> 周末
          </>
        )}
      </div>

      {/* Stats row */}
      <div className="chart-stats">
        <div className="chart-stat">
          <div className="chart-stat-value" style={{ color: '#8B5CF6' }}>{todayVisitors}</div>
          <div className="chart-stat-label">当前估算人次</div>
        </div>
        <div className="chart-stat">
          <div className="chart-stat-value" style={{ color: '#EF4444' }}>
            {daily.filter(d => d.isPeak).length > 0
              ? daily.find(d => d.isPeak)?.hour.replace(':00', ':00')
              : '—'}
          </div>
          <div className="chart-stat-label">首个高峰时段</div>
        </div>
        <div className="chart-stat">
          <div className="chart-stat-value" style={{ color: '#10B981' }}>
            {Math.round(daily.reduce((s, d) => s + d.visitors, 0) / 24 * 14)}
          </div>
          <div className="chart-stat-label">预估日均人次</div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        {view === 'daily'
          ? daily.map((point, i) => (
              <Bar key={i} point={point} maxVisitors={maxDaily} currentHour={currentHour} />
            ))
          : weekly.map((day, i) => (
              <WeeklyBar key={i} day={day} maxVisitors={maxWeekly} />
            ))
        }
      </div>

      {/* Peak hours note */}
      {view === 'daily' && peakHours.length > 0 && (
        <div className="alert alert-info" style={{ fontSize: '12px', marginTop: '8px' }}>
          🔥 高峰时段：{peakHours.slice(0, 3).join('、')}
          &nbsp;·&nbsp; 建议在这些时段确保人员充足
        </div>
      )}
    </div>
  );
}

export default TrafficChart;
