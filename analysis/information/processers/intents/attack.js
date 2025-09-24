import { getCordsFromTile, deepCloneObj } from '../util.js';

export default async function processIntent(intent, { name, manifest } = {}) {
  if (!intent.targetID) intent.targetID = "wilderness"

  return deepCloneObj(intent)
}
