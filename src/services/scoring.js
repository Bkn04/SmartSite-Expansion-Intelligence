/**
 * Store Location Scoring Service — v2.0
 *
 * Redesigned with MTA ridership as the PRIMARY foot-traffic signal.
 * Five dimensions, total 100 pts:
 *
 *   地铁人流量   35pts  MTA weekly ridership × distance decay + POI density bonus
 *   竞品格局     20pts  brand-weighted competitor count, market-validation bonus
 *   商业生态     20pts  coffee-shop-specific POI category weights
 *   区位价值     15pts  station tier + transport hub proximity
 *   时段覆盖     10pts  office / shopping / transport composition
 */

import { generateHourlyDistribution } from './heatmap';
import { getNearestStationRidership, getRidershipLabel, formatRidership } from './mtaRidership';

// ─── Scoring weights (must sum to 100) ───────────────────────────────────────
const WEIGHTS = {
  SUBWAY_TRAFFIC:  35,
  COMPETITION:     20,
  ECOSYSTEM:       20,
  LOCATION_VALUE:  15,
  TIME_COVERAGE:   10
};

// Category values tuned for coffee-shop business model
const CATEGORY_VALUE = {
  OFFICE:        2.5,  // Daily buyers, high LTV
  TRANSPORT:     2.0,  // Consistent all-day flow
  SHOPPING:      1.8,  // Afternoon & weekend spikes
  EDUCATION:     1.5,  // Student regulars
  FOOD:          1.0,  // F&B density = traffic signal, but competitive
  ENTERTAINMENT: 0.8,
  PARK:          0.4,
  RESIDENTIAL:   0.3   // Low-frequency, price-sensitive
};

// Foursquare brand competition weights (Starbucks/Luckin = strongest signals)
const BRAND_WEIGHT = {
  STARBUCKS:    1.5,
  LUCKIN:       1.4,
  BLANK_STREET: 1.2,
  DUNKIN:       1.0
};

const MAX_WEEKLY_RIDERSHIP = 650000; // Times Square benchmark

// ─── Main entry point ────────────────────────────────────────────────────────

export function calculateLocationScore({
  pois = [],
  competitors = [],
  nearestSubwayDistance = null,
  isWeekend = [0, 6].includes(new Date().getDay()),
  storeLat = null,
  storeLng = null
}) {
  const mtaInfo = (storeLat && storeLng)
    ? getNearestStationRidership(storeLat, storeLng)
    : null;

  const subwayDist = mtaInfo ? mtaInfo.distance : nearestSubwayDistance;

  const scoreBreakdown = {
    footTraffic:  calcSubwayTrafficScore(pois, mtaInfo),
    competition:  calcCompetitionScore(competitors),
    ecosystem:    calcEcosystemScore(pois),
    transit:      calcLocationValueScore(pois, mtaInfo, subwayDist),
    timeCoverage: calcTimeCoverageScore(pois, isWeekend)
  };

  const total   = Object.values(scoreBreakdown).reduce((s, d) => s + d.weighted, 0);
  const overall = Math.min(100, Math.round(total));
  const grade   = getGrade(overall);

  const reasons        = generateReasons(scoreBreakdown, competitors, pois, subwayDist, mtaInfo);
  const recommendation = generateRecommendation(overall, scoreBreakdown, mtaInfo, competitors.length);

  return { overall, grade, scoreBreakdown, reasons, recommendation, mtaInfo };
}

// ─── Dimension 1: 地铁人流量 (35 pts) ────────────────────────────────────────
// MTA ridership is the primary signal; POI high-value density adds a bonus.

function calcSubwayTrafficScore(pois, mtaInfo) {
  let raw;

  if (mtaInfo) {
    // Ridership → 0-100 (linear, capped at MAX)
    const ridershipRaw = Math.min(100, (mtaInfo.weeklyRidership / MAX_WEEKLY_RIDERSHIP) * 100);

    // Gentler distance decay: 0 miles = ×1.0, 0.5 miles = ×0.25, floor = 0.2
    const distMult = Math.max(0.2, 1 - mtaInfo.distance * 1.5);
    const stationScore = ridershipRaw * distMult;

    // High-value POI bonus (office, transport, shopping) — up to +20 pts
    const highValuePOIs = pois.filter(p =>
      ['OFFICE', 'TRANSPORT', 'SHOPPING'].includes(p.category)
    ).length;
    const poiBonus = Math.min(20, highValuePOIs * 3);

    raw = Math.min(100, stationScore + poiBonus);
  } else {
    // No MTA data: pure POI density proxy
    const count     = pois.length;
    const highValue = pois.filter(p =>
      ['SHOPPING', 'TRANSPORT', 'OFFICE'].includes(p.category)
    ).length;
    raw = Math.min(100, count * 4 + highValue * 6);
  }

  const weighted = (raw / 100) * WEIGHTS.SUBWAY_TRAFFIC;
  return {
    raw:       Math.round(raw),
    weighted:  Math.round(weighted * 10) / 10,
    maxWeight: WEIGHTS.SUBWAY_TRAFFIC,
    label:     '地铁人流'
  };
}

// ─── Dimension 2: 竞品格局 (20 pts) ──────────────────────────────────────────
// Brand-weighted competitor count. 1-2 competitors → market-validation bonus.

function calcCompetitionScore(competitors) {
  const adjusted = competitors.reduce((sum, c) => {
    const w = BRAND_WEIGHT[c.brand] ?? 0.8;
    return sum + w;
  }, 0);

  let raw;
  if      (adjusted === 0)  raw = 100;
  else if (adjusted < 1.5)  raw = 82;
  else if (adjusted < 2.5)  raw = 68;
  else if (adjusted < 4)    raw = 52;
  else if (adjusted < 6)    raw = 36;
  else                       raw = 18;

  // Market-validation: 1-2 competitors prove the area supports coffee
  const validationBonus = (competitors.length >= 1 && competitors.length <= 2) ? 5 : 0;
  const finalRaw = Math.min(100, raw + validationBonus);

  const weighted = (finalRaw / 100) * WEIGHTS.COMPETITION;
  return {
    raw:          finalRaw,
    weighted:     Math.round(weighted * 10) / 10,
    maxWeight:    WEIGHTS.COMPETITION,
    label:        '竞品格局',
    adjustedCount: Math.round(adjusted * 10) / 10
  };
}

// ─── Dimension 3: 商业生态 (20 pts) ──────────────────────────────────────────

function calcEcosystemScore(pois) {
  if (pois.length === 0) {
    return {
      raw: 15, weighted: Math.round(0.15 * WEIGHTS.ECOSYSTEM * 10) / 10,
      maxWeight: WEIGHTS.ECOSYSTEM, label: '商业生态'
    };
  }

  const cats = {};
  pois.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });

  // Category diversity bonus (up to 25)
  const diversityScore = Math.min(25, Object.keys(cats).length * 4);

  // Density score weighted by category value (up to 50)
  const officeN    = cats.OFFICE    || 0;
  const transportN = cats.TRANSPORT || 0;
  const shoppingN  = cats.SHOPPING  || 0;
  const otherN     = pois.length - officeN - transportN - shoppingN;
  const densityScore = Math.min(50,
    officeN * 7 + transportN * 6 + shoppingN * 5 + otherN * 2
  );

  // Avg category-value bonus (up to 25)
  const totalValue = pois.reduce((s, p) => s + (CATEGORY_VALUE[p.category] || 1.0), 0);
  const avgValue   = totalValue / pois.length;
  const valueBonus = Math.min(25, (avgValue - 1.0) * 20);

  const raw     = Math.min(100, diversityScore + densityScore + valueBonus);
  const weighted = (raw / 100) * WEIGHTS.ECOSYSTEM;
  return {
    raw:       Math.round(raw),
    weighted:  Math.round(weighted * 10) / 10,
    maxWeight: WEIGHTS.ECOSYSTEM,
    label:     '商业生态',
    catBreakdown: cats
  };
}

// ─── Dimension 4: 区位价值 (15 pts) ──────────────────────────────────────────
// Station tier (superstation = midtown/downtown premium) + transport POI density.

function calcLocationValueScore(pois, mtaInfo, subwayDist) {
  let raw;

  if (mtaInfo) {
    const wr = mtaInfo.weeklyRidership;
    // Tier score based on station grade
    let tierScore;
    if      (wr >= 500000) tierScore = 85; // Times Sq / Grand Central tier
    else if (wr >= 300000) tierScore = 72; // Penn Station / Fulton tier
    else if (wr >= 150000) tierScore = 56; // Mid-tier hubs
    else if (wr >= 75000)  tierScore = 40;
    else                    tierScore = 22;

    // Distance modifier: softer floor (0.2) so far stations still contribute
    const distMod = Math.max(0.2, 1 - subwayDist * 2);

    // Transport POI bonus (up to 15)
    const transportPOIs = pois.filter(p => p.category === 'TRANSPORT').length;
    const transportBonus = Math.min(15, transportPOIs * 5);

    raw = Math.min(100, tierScore * distMod + transportBonus);
  } else if (subwayDist !== null) {
    if      (subwayDist <= 0.1) raw = 85;
    else if (subwayDist <= 0.2) raw = 70;
    else if (subwayDist <= 0.3) raw = 55;
    else if (subwayDist <= 0.5) raw = 38;
    else                         raw = 20;
  } else {
    raw = 40;
  }

  const weighted = (raw / 100) * WEIGHTS.LOCATION_VALUE;
  return {
    raw:       Math.round(raw),
    weighted:  Math.round(weighted * 10) / 10,
    maxWeight: WEIGHTS.LOCATION_VALUE,
    label:     '区位价值'
  };
}

// ─── Dimension 5: 时段覆盖 (10 pts) ──────────────────────────────────────────

function calcTimeCoverageScore(pois, isWeekend) {
  const cats = {};
  pois.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });

  let score = 45; // base

  // Weekday morning rush (offices)
  if      ((cats.OFFICE || 0) >= 3) score += 20;
  else if ((cats.OFFICE || 0) >= 1) score += 10;

  // Lunch / afternoon (F&B + shopping)
  if      ((cats.SHOPPING || 0) >= 2 || (cats.FOOD || 0) >= 3) score += 20;
  else if ((cats.SHOPPING || 0) >= 1 || (cats.FOOD || 0) >= 2) score += 10;

  // All-day (transit hub)
  if ((cats.TRANSPORT || 0) >= 1) score += 15;

  // Residential-dominant: weak peak hours
  if ((cats.RESIDENTIAL || 0) > pois.length * 0.4) score -= 20;

  // Weekend: shopping helps, office heavy hurts
  if (isWeekend && (cats.SHOPPING || 0) >= 2) score += 5;
  if (isWeekend && (cats.OFFICE   || 0) > pois.length * 0.5) score -= 10;

  const raw     = Math.max(20, Math.min(100, score));
  const weighted = (raw / 100) * WEIGHTS.TIME_COVERAGE;
  return {
    raw,
    weighted:  Math.round(weighted * 10) / 10,
    maxWeight: WEIGHTS.TIME_COVERAGE,
    label:     '时段覆盖'
  };
}

// ─── Grade & presentation ─────────────────────────────────────────────────────

function getGrade(score) {
  if (score >= 85) return { letter: 'A+', label: '强烈推荐', color: '#10B981' };
  if (score >= 75) return { letter: 'A',  label: '推荐',     color: '#34D399' };
  if (score >= 65) return { letter: 'B+', label: '较好',     color: '#60A5FA' };
  if (score >= 55) return { letter: 'B',  label: '一般',     color: '#93C5FD' };
  if (score >= 45) return { letter: 'C',  label: '谨慎',     color: '#FCD34D' };
  if (score >= 35) return { letter: 'D',  label: '不建议',   color: '#F87171' };
  return              { letter: 'F',  label: '不推荐',   color: '#EF4444' };
}

function generateReasons(breakdown, competitors, pois, subwayDist, mtaInfo) {
  const reasons = [];

  // ── Subway / foot traffic ──────────────────────────────────────────────────
  if (mtaInfo) {
    const label  = getRidershipLabel(mtaInfo.weeklyRidership);
    const count  = formatRidership(mtaInfo.weeklyRidership);
    const distFt = Math.round(mtaInfo.distance * 5280);
    const name   = mtaInfo.station.name;

    if      (mtaInfo.weeklyRidership >= 400000) {
      reasons.push({ type: 'positive', icon: '🚇',
        text: `${name}（${label}，${count}）距此 ${distFt} 英尺 — 顶级客流枢纽，早高峰通勤人流密集，适合咖啡消费场景` });
    } else if (mtaInfo.weeklyRidership >= 200000) {
      reasons.push({ type: 'positive', icon: '🚇',
        text: `${name}（${label}，${count}）距此 ${distFt} 英尺，客流稳定充足` });
    } else if (mtaInfo.weeklyRidership >= 100000) {
      reasons.push({ type: 'neutral', icon: '🚶',
        text: `${name}（${label}，${count}）距此 ${distFt} 英尺，客流中等` });
    } else {
      reasons.push({ type: 'negative', icon: '⚠️',
        text: `${name}（${label}，${count}）距此 ${distFt} 英尺，站点客流有限，需依赖周边商业带动` });
    }
  } else {
    const n = pois.length;
    if      (breakdown.footTraffic.raw >= 65) {
      reasons.push({ type: 'positive', icon: '✅', text: `周边设施密集（${n} 个），人流潜力强` });
    } else if (breakdown.footTraffic.raw >= 40) {
      reasons.push({ type: 'neutral',  icon: '➡️', text: `周边设施一般（${n} 个），人流量中等` });
    } else {
      reasons.push({ type: 'negative', icon: '⚠️', text: `周边设施稀少（${n} 个），自然人流不足` });
    }
  }

  // ── Competition ────────────────────────────────────────────────────────────
  const sbCount = competitors.filter(c => c.brand === 'STARBUCKS').length;
  const lkCount = competitors.filter(c => c.brand === 'LUCKIN').length;
  const dkCount = competitors.filter(c => c.brand === 'DUNKIN').length;
  const bsCount = competitors.filter(c => c.brand === 'BLANK_STREET').length;

  if (competitors.length === 0) {
    reasons.push({ type: 'positive', icon: '✅',
      text: '0.2 英里内无直接竞品，先发优势明显，市场空白待填补' });
  } else {
    const parts = [];
    if (sbCount > 0) parts.push(`星巴克×${sbCount}`);
    if (lkCount > 0) parts.push(`瑞幸×${lkCount}`);
    if (dkCount > 0) parts.push(`Dunkin×${dkCount}`);
    if (bsCount > 0) parts.push(`Blank Street×${bsCount}`);
    const otherN = competitors.length - sbCount - lkCount - dkCount - bsCount;
    if (otherN > 0) parts.push(`其他×${otherN}`);

    if (competitors.length <= 2) {
      reasons.push({ type: 'neutral', icon: '☕',
        text: `附近 ${parts.join('、')}，竞争存在但市场已被验证，差异化可突围` });
    } else {
      reasons.push({ type: 'negative', icon: '⚠️',
        text: `竞品密集：${parts.join('、')}，需明确差异化定位（性价比 / 社交体验 / 速取效率）` });
    }
  }

  // ── Ecosystem highlights ───────────────────────────────────────────────────
  const cats = {};
  pois.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });

  if ((cats.OFFICE || 0) >= 3) {
    reasons.push({ type: 'positive', icon: '🏢',
      text: `${cats.OFFICE} 个办公楼/商业楼，工作日早晨 + 午餐时段消费能力强，复购率高` });
  } else if ((cats.OFFICE || 0) >= 1) {
    reasons.push({ type: 'neutral', icon: '🏢',
      text: `${cats.OFFICE} 个办公场所，有工作日消费基础` });
  }

  if ((cats.TRANSPORT || 0) >= 2) {
    reasons.push({ type: 'positive', icon: '🚌',
      text: `${cats.TRANSPORT} 个交通枢纽设施，全天候稳定客流，适合快取场景` });
  } else if ((cats.TRANSPORT || 0) === 1) {
    reasons.push({ type: 'neutral', icon: '🚌',
      text: `1 个交通节点附近，候车等待客群有潜力` });
  }

  if ((cats.SHOPPING || 0) >= 2) {
    reasons.push({ type: 'positive', icon: '🛍️',
      text: `${cats.SHOPPING} 个商业设施，周末 + 下班后客流活跃` });
  }
  if ((cats.EDUCATION || 0) >= 1) {
    reasons.push({ type: 'neutral', icon: '🎓',
      text: `${cats.EDUCATION} 所学校/教育机构附近，午后学生客群稳定` });
  }

  // ── Location tier note ─────────────────────────────────────────────────────
  if (mtaInfo && mtaInfo.weeklyRidership >= 300000) {
    reasons.push({ type: 'neutral', icon: '📍',
      text: `位于纽约 ${getRidershipLabel(mtaInfo.weeklyRidership)} 辐射区，商业价值高，但租金水平也相应偏高，需评估租金/营收比` });
  }

  // ── Time coverage ──────────────────────────────────────────────────────────
  if ((cats.TRANSPORT || 0) >= 1 && (cats.OFFICE || 0) >= 1) {
    reasons.push({ type: 'positive', icon: '⏰',
      text: '全天候客流结构：早高峰（通勤）→ 午餐（办公楼）→ 晚高峰（归途）' });
  } else if ((cats.RESIDENTIAL || 0) > pois.length * 0.5) {
    reasons.push({ type: 'negative', icon: '🏘️',
      text: '周边以居住区为主，工作日中段与非高峰时段客流稀疏，营业效率有限' });
  }

  return reasons;
}

function generateRecommendation(overall, breakdown, mtaInfo, competitorCount) {
  const isHighTraffic    = mtaInfo && mtaInfo.weeklyRidership >= 300000;
  const isLowCompetition = competitorCount === 0;

  if (overall >= 82) {
    return {
      text:   '综合评分优秀：人流充足、区位价值高、竞争环境良好，强烈建议优先推进。',
      action: '建议立即启动选址谈判',
      color:  '#10B981'
    };
  }
  if (overall >= 65) {
    if (isHighTraffic && !isLowCompetition) {
      return {
        text:   '高流量区域但竞争明显，库迪需以性价比或速取体验为差异化切入点。',
        action: '建议详细竞品调研 + 实地考察定价策略',
        color:  '#3B82F6'
      };
    }
    if (!isHighTraffic && isLowCompetition) {
      return {
        text:   '竞争空白但客流有待验证，建议工作日早高峰实地统计真实人流。',
        action: '建议实地踩点（工作日 7–9am）',
        color:  '#3B82F6'
      };
    }
    return {
      text:   '综合条件较好，可纳入候选名单，结合实地考察后决策。',
      action: '建议实地考察并比较 2–3 个候选位置',
      color:  '#3B82F6'
    };
  }
  if (overall >= 50) {
    return {
      text:   '综合条件中等，关键维度（人流 / 竞争 / 生态）存在明显短板，需谨慎。',
      action: '建议对比更优位置后再做决定',
      color:  '#F59E0B'
    };
  }
  return {
    text:   '综合评分偏低，选址条件不理想，建议寻找替代位置。',
    action: '建议排除，优先考虑其他候选',
    color:  '#EF4444'
  };
}

// ─── Traffic data generators ──────────────────────────────────────────────────

/**
 * Hourly visitor estimate for a full day.
 * Anchored to real MTA ridership when available (3% café capture rate).
 */
export function generateDailyTrafficData(pois = [], isWeekend = false, mtaInfo = null) {
  const hourlyDist = generateHourlyDistribution(isWeekend);

  let baseFactor;
  if (mtaInfo) {
    // estHourlyBase = how many people transit this station per hour on average
    const estHourlyBase = mtaInfo.weeklyRidership / 7 / 18;
    // Café capture rate: 2-4% of nearby foot traffic enters
    const baseVisitors = estHourlyBase * 0.03;
    baseFactor = Math.min(4.0, baseVisitors / 200);
  } else {
    baseFactor = Math.min(1.0, 0.3 + pois.length * 0.04);
  }

  return hourlyDist.map(({ hour, traffic, label }) => ({
    hour,
    traffic:  Math.round(traffic * 100),
    visitors: Math.max(1, Math.round(traffic * baseFactor * 200)),
    label,
    isPeak:   traffic >= 0.8
  }));
}

/**
 * Daily visitor pattern for Mon–Sun.
 */
export function generateWeeklyPattern(pois = [], mtaInfo = null) {
  let baseFactor;
  if (mtaInfo) {
    const estDailyBase = mtaInfo.weeklyRidership / 7;
    baseFactor = Math.min(4.0, (estDailyBase * 0.03) / 2500);
  } else {
    baseFactor = Math.min(1.0, 0.3 + pois.length * 0.04);
  }

  const days     = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const patterns = [0.82,   0.80,   0.83,   0.85,   0.92,   0.72,   0.60];

  return days.map((day, i) => ({
    day,
    traffic:  Math.round(patterns[i] * 100),
    visitors: Math.max(10, Math.round(patterns[i] * baseFactor * 2500)),
    isWeekend: i >= 5
  }));
}
