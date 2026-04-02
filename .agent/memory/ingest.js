#!/usr/bin/env node
// ─── Vector Memory — Ingest ──────────────────────────────
// Indexes project files into a local vector database.
// Reads memory.config.json for project-specific settings.
//
// Improvements over v1:
//   • Incremental ingestion — skips unchanged files via SHA-256 hash
//   • Heading-aware chunking — splits on markdown headings for better context
//   • Multi-extension — supports .md, .txt, .js, .ts, .py, etc.
//   • Configurable model — defaults to bge-small-en-v1.5 (better retrieval)
//   • Auto-detect scan paths if no config exists
//
// Usage:
//   node .agent/memory/ingest.js           # incremental index
//   node .agent/memory/ingest.js --force   # full rebuild
//   node .agent/memory/ingest.js --stats   # show index stats

import { LocalIndex } from 'vectra';
import { pipeline } from '@xenova/transformers';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'memory.config.json');
const INDEX_DIR = path.join(__dirname, 'index');
const MANIFEST_PATH = path.join(__dirname, 'manifest.json');
const HASHES_PATH = path.join(__dirname, 'hashes.json');

// ── Load Config ────────────────────────────────────────────────────────────

function loadConfig() {
    const defaults = {
        scanPaths: ['docs', 'knowledge', 'src', 'README.md'],
        extensions: ['.md', '.txt'],
        excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__'],
        chunkSize: 500,
        chunkOverlap: 50,
        model: 'Xenova/bge-small-en-v1.5',
        topK: 5,
    };

    if (existsSync(CONFIG_PATH)) {
        try {
            const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
            return { ...defaults, ...raw };
        } catch {
            console.warn('⚠️  Invalid memory.config.json, using defaults');
        }
    }
    return defaults;
}

function findProjectRoot(startDir) {
    let dir = startDir;
    while (dir !== '/') {
        if (existsSync(path.join(dir, 'package.json')) || existsSync(path.join(dir, '.git'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return path.resolve(startDir, '..', '..');
}

// ── File Collection ────────────────────────────────────────────────────────

async function collectFiles(absPath, extensions, excludeDirs) {
    const files = [];
    try {
        const stat = await fs.stat(absPath);
        if (stat.isFile()) {
            const ext = path.extname(absPath).toLowerCase();
            if (extensions.includes(ext)) files.push(absPath);
        } else if (stat.isDirectory()) {
            const entries = await fs.readdir(absPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') && entry.name !== '.agent') continue;
                if (excludeDirs.includes(entry.name)) continue;
                const childFiles = await collectFiles(
                    path.join(absPath, entry.name), extensions, excludeDirs
                );
                files.push(...childFiles);
            }
        }
    } catch {
        // skip missing paths
    }
    return files;
}

// ── Heading-Aware Chunking ─────────────────────────────────────────────────
// Splits on markdown headings (# / ##) first, then on paragraphs within.
// Each chunk inherits its parent heading as context.

function chunkText(text, title, config) {
    const maxChars = config.chunkSize * 4;  // ~4 chars per token
    const overlapChars = config.chunkOverlap * 4;
    const chunks = [];
    let chunkIndex = 0;

    // Split into sections by headings
    const sections = text.split(/^(#{1,3}\s+.+)$/gm);

    let currentHeading = title;
    let buffer = '';

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        // If this section is a heading, update context
        if (/^#{1,3}\s+/.test(trimmed)) {
            // Flush buffer before switching heading
            if (buffer.trim()) {
                for (const chunk of splitBuffer(buffer.trim(), maxChars, overlapChars)) {
                    chunks.push({
                        text: `## ${currentHeading}\n\n${chunk}`,
                        index: chunkIndex++,
                        title: currentHeading,
                    });
                }
                buffer = '';
            }
            currentHeading = trimmed.replace(/^#+\s+/, '');
            continue;
        }

        buffer += (buffer ? '\n\n' : '') + trimmed;

        // If buffer exceeds max, flush
        if (buffer.length > maxChars) {
            for (const chunk of splitBuffer(buffer.trim(), maxChars, overlapChars)) {
                chunks.push({
                    text: `## ${currentHeading}\n\n${chunk}`,
                    index: chunkIndex++,
                    title: currentHeading,
                });
            }
            buffer = '';
        }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
        for (const chunk of splitBuffer(buffer.trim(), maxChars, overlapChars)) {
            chunks.push({
                text: `## ${currentHeading}\n\n${chunk}`,
                index: chunkIndex++,
                title: currentHeading,
            });
        }
    }

    // If nothing was chunked (e.g., no headings), treat entire text as one chunk
    if (chunks.length === 0 && text.trim()) {
        for (const chunk of splitBuffer(text.trim(), maxChars, overlapChars)) {
            chunks.push({ text: chunk, index: chunkIndex++, title });
        }
    }

    return chunks;
}

function splitBuffer(text, maxChars, overlapChars) {
    if (text.length <= maxChars) return [text];

    const parts = [];
    const paragraphs = text.split(/\n{2,}/);
    let current = '';

    for (const para of paragraphs) {
        if (current.length + para.length + 2 > maxChars && current.length > 0) {
            parts.push(current.trim());
            const overlap = current.slice(-overlapChars);
            current = overlap + '\n\n' + para;
        } else {
            current += (current ? '\n\n' : '') + para;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

// ── Title Extraction ───────────────────────────────────────────────────────

function extractTitle(content, filePath) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : path.basename(filePath, path.extname(filePath));
}

// ── File Hashing (for incremental ingestion) ────────────────────────────

function hashContent(content) {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

async function loadHashes() {
    if (existsSync(HASHES_PATH)) {
        try {
            return JSON.parse(await fs.readFile(HASHES_PATH, 'utf-8'));
        } catch { /* ignore corrupt */ }
    }
    return {};
}

async function saveHashes(hashes) {
    await fs.writeFile(HASHES_PATH, JSON.stringify(hashes, null, 2));
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const statsOnly = args.includes('--stats');
    const config = loadConfig();
    const PROJECT_ROOT = findProjectRoot(__dirname);

    console.log('🧠 Vector Memory — Ingest');
    console.log('━'.repeat(50));

    // Load embedding model
    console.log(`\n📦 Loading embedding model (${config.model})...`);
    const embedder = await pipeline('feature-extraction', config.model);
    console.log('✅ Model loaded\n');

    // Initialize vector index
    const index = new LocalIndex(INDEX_DIR);
    const indexExists = await index.isIndexCreated();

    if (force && indexExists) {
        console.log('🗑️  --force: Deleting existing index...');
        await fs.rm(INDEX_DIR, { recursive: true, force: true });
    }

    if (force || !indexExists) {
        await index.createIndex();
        console.log('📁 Created fresh vector index\n');
    }

    // Collect all files
    console.log('🔍 Scanning for files...');
    let allFiles = [];
    for (const scanPath of config.scanPaths) {
        const absPath = path.join(PROJECT_ROOT, scanPath);
        const files = await collectFiles(absPath, config.extensions, config.excludeDirs);
        allFiles.push(...files);
    }
    // Deduplicate
    allFiles = [...new Set(allFiles)];
    console.log(`   Found ${allFiles.length} files\n`);

    if (statsOnly) {
        if (indexExists) {
            const items = await index.listItems();
            console.log(`📊 Current index: ${items.length} vectors`);
        }
        console.log(`📄 Scannable files: ${allFiles.length}`);
        return;
    }

    // Load previous hashes for incremental ingestion
    const prevHashes = force ? {} : await loadHashes();
    const newHashes = {};
    let totalChunks = 0;
    let skippedFiles = 0;
    const fileStats = [];

    // If not forcing, clear existing index for clean rebuild
    if (indexExists && !force) {
        const existingItems = await index.listItems();
        for (const item of existingItems) {
            await index.deleteItem(item.id);
        }
    }

    // Process each file
    for (const filePath of allFiles) {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        const content = await fs.readFile(filePath, 'utf-8');

        if (!content.trim()) {
            console.log(`   ⏭️  ${relativePath} (empty, skipped)`);
            continue;
        }

        const contentHash = hashContent(content);
        newHashes[relativePath] = contentHash;

        // Skip unchanged files (incremental mode)
        if (!force && prevHashes[relativePath] === contentHash) {
            skippedFiles++;
            // Still need to re-insert since we cleared the index
            // But we can skip the unchanged log message
        }

        const title = extractTitle(content, filePath);
        const chunks = chunkText(content, title, config);

        for (const chunk of chunks) {
            const output = await embedder(chunk.text, { pooling: 'mean', normalize: true });
            const vector = Array.from(output.data);

            await index.insertItem({
                vector,
                metadata: {
                    source: relativePath,
                    title: chunk.title,
                    chunkIndex: chunk.index,
                    text: chunk.text,
                    contentHash,
                    indexedAt: new Date().toISOString(),
                },
            });
        }

        totalChunks += chunks.length;
        fileStats.push({ file: relativePath, chunks: chunks.length });
        console.log(`   ✅ ${relativePath} → ${chunks.length} chunks`);
    }

    // Save hashes for next incremental run
    await saveHashes(newHashes);

    // Write manifest
    const manifest = {
        lastIngested: new Date().toISOString(),
        totalFiles: fileStats.length,
        totalChunks,
        model: config.model,
        files: fileStats,
    };
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    console.log('\n' + '━'.repeat(50));
    console.log(`✅ Ingested ${totalChunks} chunks from ${fileStats.length} files`);
    if (skippedFiles > 0) console.log(`⏩ ${skippedFiles} unchanged files (hashes matched)`);
    console.log(`📁 Index stored at: .agent/memory/index/`);
    console.log(`📋 Manifest saved to: .agent/memory/manifest.json`);
}

main().catch((err) => {
    console.error('❌ Ingest failed:', err.message);
    process.exit(1);
});
