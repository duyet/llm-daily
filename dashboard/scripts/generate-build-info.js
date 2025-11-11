#!/usr/bin/env node
/**
 * Generate Build Info
 *
 * Generates a buildInfo.json file with the current build timestamp
 * for display in the dashboard.
 */

const fs = require('fs');
const path = require('path');

const buildInfo = {
  buildTime: new Date().toISOString(),
  timestamp: Date.now()
};

const outputPath = path.join(__dirname, '..', 'data', 'buildInfo.json');

// Ensure data directory exists
const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write build info
fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2) + '\n', 'utf-8');

console.log('✅ Build info generated successfully!');
console.log(`   Output: ${outputPath}`);
console.log(`   Build time: ${buildInfo.buildTime}`);
