import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

import { proccessGame } from '../information/statsInfo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest() {
	// Load example game data
	const dataPath = path.join(__dirname, 'example-data', 'AlL9kaqX.json');
	const raw = fs.readFileSync(dataPath, 'utf-8');
	const game = JSON.parse(raw);

	// Run stat processing
	const stats = await proccessGame(game);

	// Print or assert some results
	console.log('Processed stats:', stats);
	// Example assertion (customize as needed):
	assert(stats, 'Stats should be returned');
	// You can add more specific assertions based on expected output
}

runTest().catch(e => {
	console.error(e);
	process.exit(1);
});
