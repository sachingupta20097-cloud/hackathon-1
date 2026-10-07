const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');
const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

console.log('\x1b[32m=======================================================\x1b[0m');
console.log('\x1b[32m🚀 Starting SmartFlow AI (Full Stack Dev Server)...\x1b[0m');
console.log('\x1b[32m=======================================================\x1b[0m\n');

function runProcess(prefix, color, cwd, cmd, args) {
  const proc = spawn(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}${prefix}\x1b[0m ${line}`);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${color}${prefix}\x1b[0m \x1b[31m${line}\x1b[0m`);
      }
    }
  });

  proc.on('close', (code) => {
    console.log(`${color}${prefix}\x1b[0m process exited with code ${code}`);
  });

  return proc;
}

// 1. Launch Backend Server
const serverProc = runProcess('[SERVER]', '\x1b[36m', serverDir, npxCmd, ['tsx', 'watch', 'src/index.ts']);

// 2. Launch Frontend Client
const clientProc = runProcess('[CLIENT]', '\x1b[35m', clientDir, npxCmd, ['vite', '--host', '--no-clearScreen']);

const cleanup = () => {
  console.log('\n\x1b[33mShutting down SmartFlow AI processes...\x1b[0m');
  try {
    if (isWin) {
      if (serverProc.pid) spawn('taskkill', ['/pid', serverProc.pid, '/T', '/F']);
      if (clientProc.pid) spawn('taskkill', ['/pid', clientProc.pid, '/T', '/F']);
    } else {
      serverProc.kill('SIGTERM');
      clientProc.kill('SIGTERM');
    }
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
