#!/usr/bin/env node
// ─── Vector Memory — Status ──────────────────────────────
// Check the health and stats of the memory index.
//
// Usage:
//   node .agent/memory/status.js

import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log('🧠 Vector Memory — Status');
    console.log('━'.repeat(50));

    // Check manifest
    const manifestPath = path.join(__dirname, 'manifest.json');
    try {
        const raw = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);

        console.log(`\n📅 Last ingested:  ${manifest.lastIngested}`);
        console.log(`📄 Total files:    ${manifest.totalFiles}`);
        console.log(`🧩 Total chunks:   ${manifest.totalChunks}`);
        if (manifest.model) console.log(`🤖 Model:          ${manifest.model}`);
        console.log(`\n📁 Indexed files:`);

        for (const { file, chunks } of manifest.files) {
            console.log(`   ${file} → ${chunks} chunks`);
        }

        // Check index
        const indexDir = path.join(__dirname, 'index');
        try {
            const indexFiles = await fs.readdir(indexDir);
            const jsonFiles = indexFiles.filter(f => f.endsWith('.json'));
            console.log(`\n💾 Index files on disk: ${jsonFiles.length}`);
        } catch {
            console.log('\n⚠️  Index directory not found');
        }

        // Check hashes file
        const hashesPath = path.join(__dirname, 'hashes.json');
        if (existsSync(hashesPath)) {
            const hashRaw = await fs.readFile(hashesPath, 'utf-8');
            const hashes = JSON.parse(hashRaw);
            console.log(`🔑 File hashes tracked: ${Object.keys(hashes).length}`);
        }

        // Check config
        const configPath = path.join(__dirname, 'memory.config.json');
        if (existsSync(configPath)) {
            const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
            console.log(`\n⚙️  Config:`);
            console.log(`   Scan paths: ${config.scanPaths?.join(', ')}`);
            console.log(`   Extensions: ${config.extensions?.join(', ')}`);
            console.log(`   Model:      ${config.model}`);
        }

    } catch {
        console.log('\n⚠️  No manifest found. Memory has not been ingested yet.');
        console.log('   Run: node .agent/memory/setup.js   (first time)');
        console.log('   Or:  node .agent/memory/ingest.js  (re-index)');
    }

    console.log('\n' + '━'.repeat(50));
}

main().catch((err) => {
    console.error('❌ Status check failed:', err.message);
    process.exit(1);
});
