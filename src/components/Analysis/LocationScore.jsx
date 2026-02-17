function ScoreRing({ score, grade }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="score-ring-container">
      <svg width="90" height="90" viewBox="0 0 90 90">
        {/* Background circle */}
        <circle cx="45" cy="45" r={radius}
          fill="none" stroke="#E5E7EB" strokeWidth="8" />
        {/* Score arc */}
        <circle cx="45" cy="45" r={radius}
          fill="none"
          stroke={grade.color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="45" y="40" textAnchor="middle" fontSize="18" fontWeight="bold" fill={grade.color}>{score}</text>
        <text x="45" y="56" textAnchor="middle" fontSize="10" fill="#6B7280">/ 100</text>
      </svg>
      <div className="score-grade" style={{ color: grade.color }}>
        <span className="grade-letter">{grade.letter}</span>
        <span className="grade-label">{grade.label}</span>
      </div>
    </div>
  );
}

function ScoreBar({ item }) {
  const pct = Math.round((item.weighted / item.maxWeight) * 100);
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{item.label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="score-bar-pts">{item.weighted}/{item.maxWeight}</span>
    </div>
  );
}

function LocationScore({ scoreResult, storeName, isLoading }) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">⭐ 选址评分</div>
        <div className="alert alert-info">
          <span className="loading-spinner" />
          <span>评分计算中...</span>
        </div>
      </div>
    );
  }
  if (!scoreResult) return null;

  const { overall, grade, scoreBreakdown, reasons, recommendation } = scoreResult;

  return (
    <div className="card score-card">
      <div className="card-header">⭐ 选址综合评分 — {storeName}</div>

      {/* Score ring + breakdown */}
      <div className="score-top">
        <ScoreRing score={overall} grade={grade} />
        <div className="score-breakdown">
          {Object.entries(scoreBreakdown).map(([key, item]) => (
            <ScoreBar key={key} item={item} />
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="recommendation-box" style={{ borderColor: recommendation.color }}>
        <div className="recommendation-text">{recommendation.text}</div>
        <div className="recommendation-action" style={{ color: recommendation.color }}>
          👉 {recommendation.action}
        </div>
      </div>

      {/* Reasons */}
      <div className="score-reasons">
        {reasons.map((r, i) => (
          <div key={i} className={`reason-item reason-${r.type}`}>
            <span>{r.icon}</span>
            <span className="reason-text">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LocationScore;
