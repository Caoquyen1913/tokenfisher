'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const EVAL_DIR = path.join(__dirname, '..');
const TASKS_DIR = path.join(EVAL_DIR, 'tasks');
const LEVELS = ['easy', 'medium', 'hard', 'complex'];

function loadTasks(filter) {
  return fs.readdirSync(TASKS_DIR)
    .filter((d) => fs.existsSync(path.join(TASKS_DIR, d, 'task.json')))
    .filter((d) => !filter || filter === 'all' || filter.split(',').some((f) => d.includes(f)))
    .sort()
    .map((id) => ({ id, dir: path.join(TASKS_DIR, id), ...JSON.parse(fs.readFileSync(path.join(TASKS_DIR, id, 'task.json'), 'utf8')) }));
}

// Fresh copy of the task's repo in a temp dir, committed so the run's diff can be captured.
function prepareWorkdir(task) {
  const wd = fs.mkdtempSync(path.join(os.tmpdir(), `tdeval-${task.id}-`));
  fs.cpSync(path.join(task.dir, 'repo'), wd, { recursive: true });
  fs.mkdirSync(path.join(wd, 'test'), { recursive: true });
  fs.copyFileSync(path.join(EVAL_DIR, 'shared', 'test-runner.js'), path.join(wd, 'test', 'run.js'));
  const prepare = path.join(task.dir, 'prepare.js');
  if (fs.existsSync(prepare)) execFileSync(process.execPath, [prepare, wd]);
  const git = (...args) => execFileSync('git', ['-c', 'user.email=eval@local', '-c', 'user.name=eval', ...args], { cwd: wd, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-qm', 'task start');
  return wd;
}

function applySolution(task, wd) {
  fs.cpSync(path.join(task.dir, 'solution'), wd, { recursive: true });
}

function grade(task, wd) {
  const r = spawnSync(process.execPath, [path.join(EVAL_DIR, 'lib', 'grade.js'), task.dir, wd], { encoding: 'utf8', timeout: 120000 });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { checks: [{ name: 'grader crashed', ok: false, error: (r.stderr || '').slice(0, 300) }], passed: 0, total: 1, score: 0 };
  }
}

function diff(wd) {
  execFileSync('git', ['add', '-A'], { cwd: wd, stdio: 'ignore' });
  return execFileSync('git', ['diff', '--cached', '--', '.', ':(exclude)logs'], { cwd: wd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

module.exports = { loadTasks, prepareWorkdir, applySolution, grade, diff, LEVELS, EVAL_DIR };
