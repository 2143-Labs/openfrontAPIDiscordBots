import fs from 'fs';
import path from 'path';

// Get all map folder names from the GitHub API
async function getMapFolders() {
  const apiUrl = 'https://api.github.com/repos/openfrontio/OpenFrontIO/contents/resources/maps';
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'fetchMapsScript' }
  });
  if (!res.ok) throw new Error(`Failed to fetch map list: ${res.status}`);
  const data = await res.json();
  // Only keep directories
  return data.filter(item => item.type === 'dir').map(item => item.name);
}

const outDir = path.resolve('../manifests');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function fetchAndSave(map) {
  const url = `https://raw.githubusercontent.com/openfrontio/OpenFrontIO/main/resources/maps/${map}/manifest.json`;
  const outPath = path.join(outDir, `${map}.json`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(outPath, text, 'utf-8');
    console.log(`Saved: ${outPath}`);
  } catch (e) {
    console.error(`Error for ${map}:`, e.message);
  }
}

(async () => {
  const maps = await getMapFolders();
  for (const map of maps) {
    console.log(`Fetching map: ${map}`);
    await fetchAndSave(map);
  }
})();