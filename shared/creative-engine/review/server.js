import express from 'express';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { log } from '../../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Starts the local review gallery server.
 * 
 * @param {Object} options 
 * @param {string} options.outputDir - Base output directory to scan for runs
 * @param {number} options.port - Server port
 */
export async function startReviewServer(options = {}) {
  const {
    outputDir = resolve(__dirname, '../../../lessons/r56-creative-engine/output'),
    port = 3456
  } = options;

  const app = express();
  app.use(express.json());

  // CORS for local dev
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Serve static UI
  app.use(express.static(join(__dirname, 'ui')));

  /**
   * Helper to scan for runs recursively
   */
  function findRuns(dir, results = []) {
    if (!existsSync(dir)) return results;
    
    const items = readdirSync(dir, { withFileTypes: true });
    
    // Check if current directory has a manifest.json
    if (items.some(item => item.name === 'manifest.json' && item.isFile())) {
      try {
        const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf-8'));
        const runId = basename(dir);
        results.push({
          id: runId,
          path: dir,
          projectName: manifest.config?.projectName || manifest.lesson || runId,
          createdAt: manifest.createdAt,
          status: manifest.status,
          version: manifest.version
        });
      } catch (err) {
        log.warn(`Failed to parse manifest in ${dir}: ${err.message}`);
      }
    }

    // Recurse into subdirectories
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        findRuns(join(dir, item.name), results);
      }
    }
    
    return results;
  }

  /**
   * Extract prompts from manifest stages
   */
  function extractPrompts(manifest) {
    const prompts = {};
    const stages = manifest.stages || {};
    
    for (const [stageKey, stageData] of Object.entries(stages)) {
      if (!stageData) continue;
      if (stageKey.includes('image') && stageData.prompt) {
        prompts.imageGeneration = stageData.prompt;
      }
      if (stageKey.includes('video') && stageData.prompt) {
        prompts.videoGeneration = stageData.prompt;
      }
    }
    
    // Also check config-level prompts
    if (manifest.config?.stages) {
      for (const [key, cfg] of Object.entries(manifest.config.stages)) {
        if (key.includes('image') && cfg.prompt && !prompts.imageGeneration) {
          prompts.imageGeneration = cfg.prompt;
        }
        if (key.includes('video') && cfg.prompt && !prompts.videoGeneration) {
          prompts.videoGeneration = cfg.prompt;
        }
      }
    }

    return prompts;
  }

  // API: List all runs
  app.get('/api/runs', (req, res) => {
    try {
      const runs = findRuns(outputDir);
      // Sort by createdAt descending
      runs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(runs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get specific run manifest (enhanced with prompts)
  app.get('/api/runs/:runId', (req, res) => {
    const { runId } = req.params;
    const runs = findRuns(outputDir);
    const run = runs.find(r => r.id === runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    try {
      const manifestPath = join(run.path, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      
      // Merge with review decisions if they exist
      const decisionsPath = join(run.path, 'review-decisions.json');
      const decisions = existsSync(decisionsPath) 
        ? JSON.parse(readFileSync(decisionsPath, 'utf-8')) 
        : {};

      // Extract prompts from stages
      const prompts = extractPrompts(manifest);

      res.json({ ...manifest, reviewDecisions: decisions, prompts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Extract all candidates from a run
  app.get('/api/runs/:runId/candidates', (req, res) => {
    const { runId } = req.params;
    const runs = findRuns(outputDir);
    const run = runs.find(r => r.id === runId);
    
    if (!run) return res.status(404).json({ error: 'Run not found' });

    try {
      const manifest = JSON.parse(readFileSync(join(run.path, 'manifest.json'), 'utf-8'));
      const decisionsPath = join(run.path, 'review-decisions.json');
      const decisions = existsSync(decisionsPath) 
        ? JSON.parse(readFileSync(decisionsPath, 'utf-8')) 
        : { candidates: {} };

      const candidates = [];
      const stages = manifest.stages || {};

      for (const [stageKey, stageData] of Object.entries(stages)) {
        if (!stageData || !stageData.flowCandidates) continue;

        stageData.flowCandidates.forEach((cand, idx) => {
          const globalId = `${stageKey}-${cand.index}`;
          const decision = decisions.candidates?.[globalId] || { status: 'pending' };
          
          candidates.push({
            id: globalId,
            stage: stageKey,
            index: cand.index,
            path: cand.path,
            selected: cand.selected,
            meta: cand.meta,
            decision: decision.status,
            notes: decision.notes || '',
            // Map absolute path to media endpoint
            mediaUrl: `/media/${runId}?path=${encodeURIComponent(cand.path)}`
          });
        });
      }

      res.json(candidates);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Save review decision
  app.post('/api/runs/:runId/candidates/:candidateId/review', (req, res) => {
    const { runId, candidateId } = req.params;
    const { status, notes } = req.body;
    
    const runs = findRuns(outputDir);
    const run = runs.find(r => r.id === runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const decisionsPath = join(run.path, 'review-decisions.json');
    let decisions = { candidates: {} };
    
    if (existsSync(decisionsPath)) {
      decisions = JSON.parse(readFileSync(decisionsPath, 'utf-8'));
    }

    decisions.candidates[candidateId] = {
      status,
      notes: notes || '',
      updatedAt: new Date().toISOString()
    };

    writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2));
    res.json({ success: true, decisions });
  });

  // API: Approve all
  app.post('/api/runs/:runId/approve-all', (req, res) => {
    const { runId } = req.params;
    const runs = findRuns(outputDir);
    const run = runs.find(r => r.id === runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    try {
      const manifest = JSON.parse(readFileSync(join(run.path, 'manifest.json'), 'utf-8'));
      const decisionsPath = join(run.path, 'review-decisions.json');
      let decisions = { candidates: {} };
      
      if (existsSync(decisionsPath)) {
        decisions = JSON.parse(readFileSync(decisionsPath, 'utf-8'));
      }

      const stages = manifest.stages || {};
      for (const [stageKey, stageData] of Object.entries(stages)) {
        if (!stageData || !stageData.flowCandidates) continue;
        stageData.flowCandidates.forEach(cand => {
          const globalId = `${stageKey}-${cand.index}`;
          // Only approve if it's currently pending or not marked
          if (!decisions.candidates[globalId] || decisions.candidates[globalId].status === 'pending') {
            decisions.candidates[globalId] = {
              status: 'approved',
              updatedAt: new Date().toISOString()
            };
          }
        });
      }

      writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2));
      res.json({ success: true, count: Object.keys(decisions.candidates).length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Export approved candidates to deliverables/
  app.post('/api/runs/:runId/export', (req, res) => {
    const { runId } = req.params;
    const runs = findRuns(outputDir);
    const run = runs.find(r => r.id === runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    try {
      const manifest = JSON.parse(readFileSync(join(run.path, 'manifest.json'), 'utf-8'));
      const decisionsPath = join(run.path, 'review-decisions.json');
      
      if (!existsSync(decisionsPath)) {
        return res.json({ success: true, count: 0, path: '' });
      }

      const decisions = JSON.parse(readFileSync(decisionsPath, 'utf-8'));
      const deliverablesDir = join(run.path, 'deliverables');
      mkdirSync(deliverablesDir, { recursive: true });

      let exportCount = 0;
      const stages = manifest.stages || {};

      for (const [stageKey, stageData] of Object.entries(stages)) {
        if (!stageData || !stageData.flowCandidates) continue;

        stageData.flowCandidates.forEach(cand => {
          const globalId = `${stageKey}-${cand.index}`;
          const decision = decisions.candidates?.[globalId];
          
          if (decision && decision.status === 'approved' && cand.path) {
            const srcPath = resolve(cand.path);
            if (existsSync(srcPath)) {
              const ext = cand.path.split('.').pop();
              const cleanName = `${stageKey}_candidate${cand.index + 1}.${ext}`;
              const destPath = join(deliverablesDir, cleanName);
              copyFileSync(srcPath, destPath);
              exportCount++;
            }
          }
        });
      }

      res.json({ 
        success: true, 
        count: exportCount, 
        path: deliverablesDir 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Media Serving: Proxy local files
  app.get('/media/:runId', (req, res) => {
    const { path } = req.query;
    if (!path) return res.status(400).send('Missing path');

    const resolvedPath = resolve(path);
    const resolvedOutputDir = resolve(outputDir);

    // Security: Only serve if within outputDir
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      return res.status(403).send('Forbidden: Path outside of output directory');
    }

    if (!existsSync(resolvedPath)) {
      return res.status(404).send('File not found');
    }

    res.sendFile(resolvedPath);
  });

  app.listen(port, () => {
    log.success(`🚀 Review gallery server running at http://localhost:${port}`);
    log.info(`   Scanning runs in: ${outputDir}`);
  });

  return app;
}
