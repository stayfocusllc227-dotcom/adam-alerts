const WORLD_CUP_MARKERS = ["world cup", "fifa world cup"];

function impliedProbability(odds) {
  return odds > 1 ? 1 / odds : 0;
}

function confidenceFromOdds(odds, boost = 0) {
  const probability = impliedProbability(odds);
  return Math.max(55, Math.min(94, Math.round(probability * 100 + 24 + boost)));
}

function stakeFromConfidence(confidence) {
  if (confidence >= 88) return "3 units";
  if (confidence >= 78) return "2 units";
  return "1 unit";
}

function isWorldCupEvent(event) {
  const haystack = `${event.sportKey || ""} ${event.league?.name || ""}`.toLowerCase();
  return WORLD_CUP_MARKERS.some((marker) => haystack.includes(marker));
}

export function rankBestBets(oddsEvents, { worldCupMode = true } = {}) {
  const candidates = [];

  for (const event of oddsEvents) {
    for (const bookmaker of event.bookmakers || []) {
      const h2h = bookmaker.markets?.find((market) => market.key === "h2h");
      const totals = bookmaker.markets?.find((market) => market.key === "totals");
      const markets = [h2h, totals].filter(Boolean);

      for (const market of markets) {
        for (const outcome of market.outcomes || []) {
          const odds = Number(outcome.price);
          if (!Number.isFinite(odds) || odds <= 1) continue;

          const worldCupBoost = worldCupMode && isWorldCupEvent(event) ? 9 : 0;
          const marketBoost = market.key === "totals" ? 3 : 0;
          const confidence = confidenceFromOdds(odds, worldCupBoost + marketBoost);
          const label = outcome.point !== undefined ? `${outcome.name} ${outcome.point}` : outcome.name;

          candidates.push({
            id: `${event.id}:${bookmaker.key || bookmaker.title}:${market.key}:${label}`,
            match: `${event.homeTeam} vs ${event.awayTeam}`,
            recommendedBet: label,
            odds,
            confidence,
            stake: stakeFromConfidence(confidence),
            worldCup: worldCupBoost > 0,
          });
        }
      }
    }
  }

  return candidates
    .sort((a, b) => {
      if (a.worldCup !== b.worldCup) return a.worldCup ? -1 : 1;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.odds - a.odds;
    })
    .slice(0, 10);
}
