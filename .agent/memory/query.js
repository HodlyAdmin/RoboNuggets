#!/usr/bin/env node
// ─── Vector Memory — Query ───────────────────────────────
// Semantic search across the project's indexed knowledge.
//
// Usage:
//   node .agent/memory/query.js "your question here"
//   node .agent/memory/query.js --top 10 "your question here"

import { LocalIndex } from 'vectra';
import { pipeline } from '@xenova/transformers';
import { existsSync, readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_DIR = path.join(__dirname, 'index');
const CONFIG_PATH = path.join(__dirname, 'memory.config.json');

function loadConfig() {
    const defaults = { model: 'Xenova/bge-small-en-v1.5', topK: 5 };
    if (existsSync(CONFIG_PATH)) {
        try {
            const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
            return { ...defaults, ...raw };
        } catch { /* fall through */ }
    }
    return defaults;
}

async function main() {
    const args = process.argv.slice(2);
    const config = loadConfig();

    // Parse --top N
    let topN = config.topK;
    const topIdx = args.indexOf('--top');
    const skipIndices = new Set();

    if (topIdx !== -1) {
        skipIndices.add(topIdx);
        if (args[topIdx + 1]) {
            topN = parseInt(args[topIdx + 1], 10) || config.topK;
            skipIndices.add(topIdx + 1);
        }
    }

    const query = args
        .filter((_, i) => !skipIndices.has(i) && !args[i].startsWith('--'))
        .join(' ')
        .trim();

    if (!query) {
        console.log('🧠 Vector Memory — Query');
        console.log('━'.repeat(50));
        console.log('\nUsage:');
        console.log('  node .agent/memory/query.js "your question here"');
        console.log('  node .agent/memory/query.js --top 10 "your question"');
        console.log('\nExamples:');
        console.log('  node .agent/memory/query.js "project overview"');
        console.log('  node .agent/memory/query.js "how does the pipeline work"');
        console.log('  node .agent/memory/query.js "architecture decisions"');
        process.exit(0);
    }

    // Check index
    const index = new LocalIndex(INDEX_DIR);
    if (!(await index.isIndexCreated())) {
        console.error('❌ No vector index found. Run ingest first:');
        console.error('   node .agent/memory/ingest.js');
        process.exit(1);
    }

    // Load model and query
    const embedder = await pipeline('feature-extraction', config.model);
    const output = await embedder(query, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);

    const results = await index.queryItems(vector, topN);

    if (results.length === 0) {
        console.log('🔍 No results found for:', query);
        process.exit(0);
    }

    // Display
    console.log(`🧠 Query: "${query}"`);
    console.log(`📊 Top ${results.length} results:\n`);
    console.log('━'.repeat(60));

    for (let i = 0; i < results.length; i++) {
        const { score, item } = results[i];
        const { source, title, chunkIndex, text } = item.metadata;
        const relevance = (score * 100).toFixed(1);

        console.log(`\n[${i + 1}] ${title}`);
        console.log(`    📄 Source: ${source} (chunk ${chunkIndex})`);
        console.log(`    📈 Relevance: ${relevance}%`);
        console.log(`    ─────────────────────────────`);

        for (const line of text.split('\n')) {
            console.log(`    ${line}`);
        }

        if (i < results.length - 1) {
            console.log('\n' + '━'.repeat(60));
        }
    }

    console.log('\n' + '━'.repeat(60));
}

main().catch((err) => {
    console.error('❌ Query failed:', err.message);
    process.exit(1);
});
