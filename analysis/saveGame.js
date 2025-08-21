export default function saveGame(gameId) {
  const url = `https://openfront.pro/api/v1/games/${gameId}/analyze`;
  const sessionToken = process.env.ANALYSIS_TOKEN;

  if (!sessionToken) {
    console.error("Missing ANALYSIS_TOKEN in environment variables");
    return;
  }

  // Fire-and-forget fetch
  fetch(url, {
    method: 'POST',
    headers: {
      'Cookie': `session_token=${sessionToken}`,
    },
  }).catch(err => {
    // Optional: log errors if the request fails
    console.error(`Failed to analyze game ${gameId}:`, err);
  });
}

