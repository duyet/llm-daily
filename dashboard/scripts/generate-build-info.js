#!/usr/bin/env node
/**
 * Generate build information file for dashboard
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildInfo = {
  buildTime: new Date().toISOString(),
  timestamp: Date.now(),
};

const outputPath = path.join(__dirname, '../data/buildInfo.json');

async function generateBuildInfo() {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Write build info
    await fs.writeFile(
      outputPath,
      JSON.stringify(buildInfo, null, 2),
      'utf-8'
    );

    console.log('✅ Build info generated:', buildInfo.buildTime);
  } catch (error) {
    console.error('❌ Failed to generate build info:', error);
    process.exit(1);
  }
}

generateBuildInfo();
