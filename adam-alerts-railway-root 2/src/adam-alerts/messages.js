export function formatAdamAlert({ match, score, minute, recommendedBet, confidence, extra = "" }) {
  const lines = [
    "🚨 ADAM ALERT",
    "",
    `Match: ${match || "N/A"}`,
    `Score: ${score || "N/A"}`,
    `Minute: ${minute || "N/A"}`,
    "",
    `Recommended Bet: ${recommendedBet || "Monitor live value"}`,
    `Confidence: ${confidence || "N/A"}`,
    extra ? `\n${extra}` : "",
    "",
    "ADAM Betting Intelligence",
  ];

  return lines.join("\n");
}

export function formatDailyBestBets(bets, date) {
  const rows = bets.map((bet, index) => {
    return [
      `${index + 1}. ${bet.match}`,
      `Bet: ${bet.recommendedBet}`,
      `Odds: ${bet.odds.toFixed(2)} | Confidence: ${bet.confidence}% | Stake: ${bet.stake}`,
    ].join("\n");
  });

  return [
    "🚨 ADAM ALERT",
    "",
    `Daily Best Bets: ${date}`,
    "Top 10 football bets",
    "",
    rows.join("\n\n"),
    "",
    "ADAM Betting Intelligence",
  ].join("\n");
}
