#!/usr/bin/env node
// ─── Vector Memory — One-Command Setup ───────────────────
// Bootstraps the memory system in any project.
//
// Usage:
//   node .agent/memory/setup.js
//
// What it does:
//   1. Checks for vectra + @xenova/transformers → installs if missing
//   2. Auto-detects project structure → creates memory.config.json
//   3. Runs the first ingest

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = findProjectRoot(__dirname);
const CONFIG_PATH = join(__dirname, 'memory.config.json');

// ── Find project root (walk up to package.json or .git) ──────────────────

function findProjectRoot(startDir) {
    let dir = startDir;
    while (dir !== '/') {
        if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, '.git'))) {
            return dir;
        }
        dir = dirname(dir);
    }
    // Fallback: two levels up from .agent/memory/
    return join(startDir, '..', '..');
}

// ── Step 1: Check & Install Dependencies ──────────────────────────────────

function ensureDependencies() {
    console.log('📦 Checking dependencies...');

    const deps = ['vectra', '@xenova/transformers'];
    const missing = [];

    for (const dep of deps) {
        try {
            // Check if the module can be resolved from the project root
            const pkgPath = join(PROJECT_ROOT, 'node_modules', dep);
            if (!existsSync(pkgPath)) {
                missing.push(dep);
            }
        } catch {
            missing.push(dep);
        }
    }

    if (missing.length === 0) {
        console.log('   ✅ All dependencies installed\n');
        return;
    }

    console.log(`   Installing: ${missing.join(', ')}...`);

    // Check if package.json exists, create minimal one if not
    const pkgJsonPath = join(PROJECT_ROOT, 'package.json');
    if (!existsSync(pkgJsonPath)) {
        console.log('   Creating package.json...');
        writeFileSync(pkgJsonPath, JSON.stringify({
            name: 'project',
            version: '1.0.0',
            type: 'module',
            private: true,
        }, null, 2));
    }

    // Ensure "type": "module" is set (needed for ESM imports)
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    if (pkg.type !== 'module') {
        pkg.type = 'module';
        writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));
        console.log('   Set "type": "module" in package.json');
    }

    try {
        execSync(`npm install --save ${missing.join(' ')}`, {
            cwd: PROJECT_ROOT,
            stdio: 'pipe',
        });
        console.log('   ✅ Dependencies installed\n');
    } catch (err) {
        console.error(`   ❌ Install failed: ${err.message}`);
        console.error(`   Try manually: cd ${PROJECT_ROOT} && npm install ${missing.join(' ')}`);
        process.exit(1);
    }
}

// ── Step 2: Auto-Detect & Create Config ───────────────────────────────────

function autoDetectConfig() {
    if (existsSync(CONFIG_PATH)) {
        console.log('⚙️  Config already exists at memory.config.json');
        console.log('   Edit it to customize scan paths\n');
        return;
    }

    console.log('🔍 Auto-detecting project structure...');

    // Common directories to check for
    const candidates = [
        // Documentation
        'docs', 'documentation', 'wiki',
        // Knowledge bases
        'knowledge', 'admin', 'notes',
        // Source code
        'src', 'lib', 'core', 'app', 'packages',
        // Skills / automation
        'skills', '.agent/skills', '.agent/workflows',
        // Templates
        'templates', 'core/templates',
        // Config files
        'README.md', 'WORKSPACE-MAP.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md',
    ];

    const detected = [];
    for (const candidate of candidates) {
        const absPath = join(PROJECT_ROOT, candidate);
        if (existsSync(absPath)) {
            detected.push(candidate);
            console.log(`   ✅ Found: ${candidate}`);
        }
    }

    if (detected.length === 0) {
        // Fall back to scanning root for any markdown files
        detected.push('.');
        console.log('   ℹ️  No standard directories found — will scan entire project');
    }

    const config = {
        scanPaths: detected,
        extensions: ['.md', '.txt'],
        excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__'],
        chunkSize: 500,
        chunkOverlap: 50,
        model: 'Xenova/bge-small-en-v1.5',
        topK: 5,
    };

    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`\n   📝 Created memory.config.json with ${detected.length} scan paths`);
    console.log('   Edit this file to add/remove paths or change settings\n');
}

// ── Step 3: Run First Ingest ──────────────────────────────────────────────

function runIngest() {
    console.log('🧠 Running first ingest...\n');
    try {
        execSync('node ' + join(__dirname, 'ingest.js'), {
            cwd: PROJECT_ROOT,
            stdio: 'inherit',
        });
    } catch {
        console.error('\n❌ Ingest failed. Check the error above and try:');
        console.error('   node .agent/memory/ingest.js');
        process.exit(1);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log('🚀 Vector Memory — Setup');
console.log('━'.repeat(50));
console.log(`📂 Project root: ${PROJECT_ROOT}\n`);

ensureDependencies();
autoDetectConfig();
runIngest();

console.log('\n🎉 Setup complete! Try querying:');
console.log('   node .agent/memory/query.js "project overview"');
