#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const args = process.argv.slice(2);
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : process.cwd();
const targetDir = resolve(dirArg);

const knownStates = new Map();
const terminalStates = ['needs-review', 'completed', 'failed'];

async function notifyDesktop(title, message) {
  if (process.platform === 'darwin') {
    try {
      const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`;
      await execAsync(`osascript -e '${script}'`);
    } catch(e) {}
  }
}

function findStateFiles(dir) {
  let results = [];
  if (!existsSync(dir)) return results;
  
  let list;
  try {
    list = readdirSync(dir);
  } catch (e) {
    return results;
  }

  for (const file of list) {
    if (file === '.archive' || file === 'node_modules' || file === '.git' || file === 'assets') continue;
    const fullPath = join(dir, file);
    
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (file === '.flow-jobs') {
          const jobs = readdirSync(fullPath).filter(f => f.endsWith('.state.json'));
          results.push(...jobs.map(j => join(fullPath, j)));
        } else {
          results.push(...findStateFiles(fullPath));
        }
      }
    } catch (e) {}
  }
  return results;
}

let isFirstPoll = true;

async function poll() {
  const stateFiles = findStateFiles(targetDir);
  
  let output = [];
  output.push(`👀 Watcher active on: ${targetDir}`);
  output.push(`⏳ Polling for jobs... (Ctrl+C to exit)\n`);

  const currentStates = [];

  for (const file of stateFiles) {
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      if (data.jobId && data.status) {
        currentStates.push(data);
      }
    } catch(e) {}
  }

  // Sort by updatedAt descending
  currentStates.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  for (const job of currentStates) {
    const prevStatus = knownStates.get(job.jobId);
    
    // Notify on transition to a terminal state (not on first poll)
    if (!isFirstPoll && prevStatus !== job.status) {
      if (terminalStates.includes(job.status)) {
        const emoji = job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '⚠️';
        notifyDesktop(`${emoji} Job ${job.status.toUpperCase()}`, `Job ${job.jobId} moved to ${job.status}`);
      }
    }
    knownStates.set(job.jobId, job.status);
  }

  // Render dashboard
  const activeJobs = currentStates.filter(j => !terminalStates.includes(j.status));
  const recentTerminal = currentStates.filter(j => terminalStates.includes(j.status)).slice(0, 5);

  output.push(`🏃 ACTIVE JOBS (${activeJobs.length})`);
  if (activeJobs.length === 0) {
    output.push(`  (None)`);
  }
  for (const job of activeJobs) {
    output.push(`  - [${job.status.toUpperCase()}] ${job.jobId} (Provider: Flow)`);
  }
  
  output.push(`\n🏁 RECENTLY FINISHED (${recentTerminal.length})`);
  if (recentTerminal.length === 0) {
    output.push(`  (None)`);
  }
  for (const job of recentTerminal) {
    const icon = job.status === 'completed' ? '✅' : job.status === 'failed' ? '❌' : '⚠️';
    output.push(`  ${icon} [${job.status.toUpperCase()}] ${job.jobId}`);
    if (job.status === 'needs-review') {
      output.push(`      ↳ Needs manual review at: ${job.statePath || 'output dir'}`);
    } else if (job.status === 'failed') {
      output.push(`      ↳ Error: ${job.error || 'Unknown error'}`);
    }
  }

  console.clear();
  console.log(output.join('\n'));
  
  isFirstPoll = false;
  setTimeout(poll, 2000);
}

// Start loop
poll();
