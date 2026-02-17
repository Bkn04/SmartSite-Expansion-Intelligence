/**
 * Store Location Scoring Service
 * Generates a comprehensive investment score and detailed reasoning for each store location.
 * Transit score and foot traffic now incorporate real MTA ridership data where available.
 */

import { calculateDistance } from '../utils/distance';
import { generateHourlyDistribution } from './heatmap';
import { getNearestStationRidership, getRidershipLabel, formatRidership } from './mtaRidership';

// Scoring weights (total = 100)
const WEIGHTS = {
  FOOT_TRAFFIC: 30,       // 人流量
  COMPETITION: 20,        // 竞品竞争压力
  BUSINESS_ECOSYSTEM: 20, // 业态生态
  TRANSIT_ACCESS: 15,     // 交通便利性
  TIME_COVERAGE: 15       // 营业时段覆盖性
};

// Business category boost scores
const CATEGORY_BOOSTS = {
  SHOPPING: 1.4,
  TRANSPORT: 1.5,
  OFFICE: 1.3,
  EDUCATION: 1.2,
  FOOD: 1.1,
  ENTERTAINMENT: 1.0,
  PARK: 0.7,
  RESIDENTIAL: 0.6
};

/**
 * Calculate comprehensive investment score for a store location.
 * Pass storeLat/storeLng to enable real MTA ridership lookup.
 */
export function calculateLocationScore({
  pois = [],
  competitors = [],
  nearestSubwayDistance = null,
  currentHour = new Date().getHours(),
  isWeekend = [0, 6].includes(new Date().getDay()),
  storeLat = null,
  storeLng = null
}) {
  const scoreBreakdown = {};

  // Look up real MTA ridership data if coordinates provided
  const mtaInfo = (storeLat && storeLng)
    ? getNearestStationRidership(storeLat, storeLng)
    : null;

  // Use real station distance if MTA lookup succeeded
  const subwayDist = mtaInfo ? mtaInfo.distance : nearestSubwayDistance;

  // 1. Foot Traffic Score (30 pts) — uses real MTA ridership when available
  scoreBreakdown.footTraffic = calcFootTrafficScore(pois, mtaInfo);

  // 2. Competition Score (20 pts)
  scoreBreakdown.competition = calcCompetitionScore(competitors.length);

  // 3. Business Ecosystem Score (20 pts)
  scoreBreakdown.ecosystem = calcEcosystemScore(pois);

  // 4. Transit Access Score (15 pts) — uses real ridership-weighted score
  scoreBreakdown.transit = calcTransitScore(subwayDist, mtaInfo);

  // 5. Time Coverage Score (15 pts)
  scoreBreakdown.timeCoverage = calcTimeCoverageScore(isWeekend);

  // Total
  const total = Object.values(scoreBreakdown).reduce((sum, s) => sum + s.weighted, 0);
  const overall = Math.min(100, Math.round(total));
  const grade = getGrade(overall);
  const reasons = generateReasons(scoreBreakdown, competitors.length, pois, subwayDist, mtaInfo);
  const recommendation = generateRecommendation(overall, scoreBreakdown);
  const dailyTraffic = generateDailyTrafficData(pois, isWeekend, mtaInfo);

  return { overall, grade, scoreBreakdown, reasons, recommendation, dailyTraffic, mtaInfo };
}

/** Foot Traffic Score — blends POI density with real MTA station ridership */
function calcFootTrafficScore(pois, mtaInfo) {
  const count = pois.length;
  const highValue = pois.filter(p => ['SHOPPING', 'TRANSPORT', 'OFFICE'].includes(p.category)).length;

  // POI-based base score (0–60)
  let poiScore = Math.min(60, count * 3 + highValue * 5);

  // MTA ridership bonus (0–40) — real data
  let ridershipBonus = 0;
  if (mtaInfo) {
    // footTrafficScore from MTA is 0–100; scale to 0–40 bonus points
    ridershipBonus = Math.round(mtaInfo.footTrafficScore * 0.4);
  }

  const raw = Math.min(100, poiScore + ridershipBonus);
  const weighted = (raw / 100) * WEIGHTS.FOOT_TRAFFIC;

  return {
    raw: Math.round(raw),
    weighted: Math.round(weighted),
    maxWeight: WEIGHTS.FOOT_TRAFFIC,
    label: '人流量'
  };
}

/** Competition Score — fewer competitors = higher score */
function calcCompetitionScore(competitorCount) {
  let raw;
  if (competitorCount === 0) raw = 100;
  else if (competitorCount === 1) raw = 85;
  else if (competitorCount === 2) raw = 70;
  else if (competitorCount === 3) raw = 55;
  else if (competitorCount <= 5) raw = 40;
  else raw = 20;

  const weighted = (raw / 100) * WEIGHTS.COMPETITION;
  return { raw, weighted: Math.round(weighted), maxWeight: WEIGHTS.COMPETITION, label: '竞争环境' };
}

/** Business Ecosystem Score */
function calcEcosystemScore(pois) {
  if (pois.length === 0) {
    return { raw: 20, weighted: Math.round(0.2 * WEIGHTS.BUSINESS_ECOSYSTEM), maxWeight: WEIGHTS.BUSINESS_ECOSYSTEM, label: '业态生态' };
  }

  const uniqueCategories = new Set(pois.map(p => p.category));
  const diversityBonus = Math.min(30, uniqueCategories.size * 5);

  let categoryBoost = 0;
  pois.forEach(poi => { categoryBoost += (CATEGORY_BOOSTS[poi.category] || 1.0); });
  const avgBoost = categoryBoost / pois.length;

  const raw = Math.min(100, diversityBonus + avgBoost * 25);
  const weighted = (raw / 100) * WEIGHTS.BUSINESS_ECOSYSTEM;
  return { raw: Math.round(raw), weighted: Math.round(weighted), maxWeight: WEIGHTS.BUSINESS_ECOSYSTEM, label: '业态生态' };
}

/** Transit Access Score — uses real MTA ridership when available */
function calcTransitScore(subwayDist, mtaInfo) {
  let raw;

  if (mtaInfo) {
    // Blend distance score + ridership score for a more accurate picture
    let distScore;
    if (subwayDist <= 0.1)      distScore = 100;
    else if (subwayDist <= 0.2) distScore = 88;
    else if (subwayDist <= 0.3) distScore = 72;
    else if (subwayDist <= 0.5) distScore = 52;
    else                         distScore = 28;

    // Ridership bonus: up to +15 pts for a top-tier station
    const ridershipBonus = Math.round(mtaInfo.footTrafficScore * 0.15);
    raw = Math.min(100, distScore + ridershipBonus);
  } else if (subwayDist !== null) {
    if (subwayDist <= 0.1)      raw = 100;
    else if (subwayDist <= 0.2) raw = 90;
    else if (subwayDist <= 0.3) raw = 75;
    else if (subwayDist <= 0.5) raw = 55;
    else                         raw = 30;
  } else {
    raw = 50; // unknown
  }

  const weighted = (raw / 100) * WEIGHTS.TRANSIT_ACCESS;
  return { raw: Math.round(raw), weighted: Math.round(weighted), maxWeight: WEIGHTS.TRANSIT_ACCESS, label: '交通便利性' };
}

/** Time Coverage Score */
function calcTimeCoverageScore(isWeekend) {
  const raw = isWeekend ? 75 : 85;
  const weighted = (raw / 100) * WEIGHTS.TIME_COVERAGE;
  return { raw, weighted: Math.round(weighted), maxWeight: WEIGHTS.TIME_COVERAGE, label: '时段覆盖' };
}

/** Convert score to letter grade */
function getGrade(score) {
  if (score >= 85) return { letter: 'A+', label: '强烈推荐', color: '#10B981' };
  if (score >= 75) return { letter: 'A',  label: '推荐',     color: '#34D399' };
  if (score >= 65) return { letter: 'B+', label: '较好',     color: '#60A5FA' };
  if (score >= 55) return { letter: 'B',  label: '一般',     color: '#93C5FD' };
  if (score >= 45) return { letter: 'C',  label: '谨慎',     color: '#FCD34D' };
  if (score >= 35) return { letter: 'D',  label: '不建议',   color: '#F87171' };
  return              { letter: 'F',  label: '不推荐',   color: '#EF4444' };
}

/** Generate human-readable reasons */
function generateReasons(breakdown, competitorCount, pois, subwayDist, mtaInfo) {
  const reasons = [];

  // Foot traffic — mention real MTA data if available
  if (mtaInfo) {
    const label = getRidershipLabel(mtaInfo.station.weeklyRidership);
    const count = formatRidership(mtaInfo.station.weeklyRidership);
    const distFt = Math.round(mtaInfo.distance * 5280);
    if (breakdown.footTraffic.raw >= 65) {
      reasons.push({ type: 'positive', icon: '✅', text: `${mtaInfo.station.name}（${label}，${count}）距此${distFt}英尺，带来稳定客流` });
    } else if (breakdown.footTraffic.raw >= 40) {
      reasons.push({ type: 'neutral', icon: '➡️', text: `附近地铁站（${count}）人流量中等，步行${distFt}英尺` });
    } else {
      reasons.push({ type: 'negative', icon: '⚠️', text: `最近地铁站（${count}）客流有限，且距离${distFt}英尺` });
    }
  } else {
    if (breakdown.footTraffic.raw >= 70) {
      reasons.push({ type: 'positive', icon: '✅', text: `周边设施密集（${pois.length}个），人流潜力强` });
    } else if (breakdown.footTraffic.raw >= 40) {
      reasons.push({ type: 'neutral', icon: '➡️', text: `周边设施一般（${pois.length}个），人流量中等` });
    } else {
      reasons.push({ type: 'negative', icon: '⚠️', text: `周边设施稀少（${pois.length}个），自然人流不足` });
    }
  }

  // Competition
  if (competitorCount === 0) {
    reasons.push({ type: 'positive', icon: '✅', text: '0.2英里内无竞品，市场空白' });
  } else if (competitorCount <= 2) {
    reasons.push({ type: 'neutral', icon: '➡️', text: `附近${competitorCount}家竞品，竞争适中` });
  } else {
    reasons.push({ type: 'negative', icon: '⚠️', text: `附近${competitorCount}家竞品，竞争激烈` });
  }

  // Ecosystem details
  const officeCount    = pois.filter(p => p.category === 'OFFICE').length;
  const shopCount      = pois.filter(p => p.category === 'SHOPPING').length;
  const transportCount = pois.filter(p => p.category === 'TRANSPORT').length;

  if (officeCount >= 3)    reasons.push({ type: 'positive', icon: '🏢', text: `${officeCount}个办公楼，午餐/早餐时段客流稳定` });
  if (shopCount >= 2)      reasons.push({ type: 'positive', icon: '🛍️', text: `${shopCount}个商业设施，周末客流量大` });
  if (transportCount >= 1) reasons.push({ type: 'positive', icon: '🚇', text: '交通枢纽附近，过路客流充足' });

  // Transit
  if (subwayDist !== null) {
    const ft = Math.round(subwayDist * 5280);
    const stationName = mtaInfo ? mtaInfo.station.name : '地铁站';
    if (subwayDist <= 0.15)      reasons.push({ type: 'positive', icon: '🚇', text: `${stationName}仅 ${ft} 英尺，出行极便利` });
    else if (subwayDist <= 0.4)  reasons.push({ type: 'neutral',  icon: '🚶', text: `距${stationName} ${ft} 英尺，步行可达` });
    else                         reasons.push({ type: 'negative', icon: '⚠️', text: `距${stationName} ${ft} 英尺，交通略不便` });
  }

  return reasons;
}

/** Generate final recommendation */
function generateRecommendation(overall) {
  if (overall >= 75) return { text: '该位置综合条件优秀，人流量充足、竞争适中、交通便利，强烈建议优先考虑。', action: '建议立即推进选址流程', color: '#10B981' };
  if (overall >= 60) return { text: '该位置条件较好，但部分维度有改善空间，可结合实地考察后决策。', action: '建议实地考察后决定', color: '#3B82F6' };
  if (overall >= 45) return { text: '该位置条件一般，人流量或竞争环境存在明显短板，需谨慎评估。', action: '建议谨慎评估，对比其他候选', color: '#F59E0B' };
  return { text: '该位置综合条件较差，不建议作为优先选址。', action: '建议寻找更好的替代位置', color: '#EF4444' };
}

/**
 * Generate hourly traffic data for a full day.
 * Scales visitor counts using real MTA station ridership when available.
 */
export function generateDailyTrafficData(pois = [], isWeekend = false, mtaInfo = null) {
  const hourlyDist = generateHourlyDistribution(isWeekend);

  // Base factor: blend POI density + real ridership
  let baseFactor = Math.min(1.0, 0.3 + pois.length * 0.03);

  if (mtaInfo) {
    // Anchor on real weekly ridership → estimated daily → per-hour base
    // weeklyRidership / 7 days / 18 active hours ≈ hourly visitors near station
    const estHourlyBase = mtaInfo.station.weeklyRidership / 7 / 18;
    // Cotti will capture ~2-5% of passersby → use 3%
    const cottiFraction = 0.03;
    const baseVisitors = estHourlyBase * cottiFraction;
    // Normalize: baseFactor as multiplier relative to 300 default
    baseFactor = Math.min(3.0, baseVisitors / 300);
  }

  return hourlyDist.map(({ hour, traffic, label }) => {
    const estimatedVisitors = Math.max(1, Math.round(traffic * baseFactor * 300));
    return {
      hour,
      traffic: Math.round(traffic * 100),
      visitors: estimatedVisitors,
      label,
      isPeak: traffic >= 0.8
    };
  });
}

/**
 * Calculate weekly pattern (Mon–Sun).
 */
export function generateWeeklyPattern(pois = [], mtaInfo = null) {
  let baseFactor = Math.min(1.0, 0.3 + pois.length * 0.03);

  if (mtaInfo) {
    const estDailyBase = mtaInfo.station.weeklyRidership / 7;
    const baseVisitors = estDailyBase * 0.03;
    baseFactor = Math.min(3.0, baseVisitors / 4000);
  }

  const days     = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const patterns = [0.82,   0.80,   0.83,   0.85,   0.90,   0.78,   0.65];

  return days.map((day, i) => ({
    day,
    traffic: Math.round(patterns[i] * 100),
    visitors: Math.max(10, Math.round(patterns[i] * baseFactor * 4000)),
    isWeekend: i >= 5
  }));
}
