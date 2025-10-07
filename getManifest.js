import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Fetches a manifest from the manifests folder by map name.
 * @param {string} mapName - The map name (any case, any spaces)
 * @returns {object|null} The manifest object, or null if not found or invalid
 */
export function getManifest(mapName) {
  if (!mapName) return null;
  // Lowercase and remove spaces
  const fileName = mapName.toLowerCase().replace(/\s+/g, '') + '.json';
  // Always resolve relative to this file's directory
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.resolve(__dirname, 'manifests', fileName);
  try {
    const data = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(data);
    //console.log(manifest);
    return manifest;
  } catch (e) {
    console.error('Error reading manifest file', e);
    return null;
  }
}
