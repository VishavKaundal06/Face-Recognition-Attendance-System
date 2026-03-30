 
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const PORT = Number(process.env.PORT || 5050);
const PID_DIR = path.resolve(__dirname, '..', '..', '.pids');
const PID_FILE = path.join(PID_DIR, 'backend.pid');

function isProcessAlive(pid) {
  if (!pid || Number.isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryReadPidFile() {
  try {
    if (!fs.existsSync(PID_FILE)) return null;
    const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
    const pid = Number(raw);
    if (!pid || Number.isNaN(pid)) return null;
    return pid;
  } catch {
    return null;
  }
}

function safeRemovePidFile(expectedPid) {
  try {
    if (!fs.existsSync(PID_FILE)) return;
    const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
    const currentPid = Number(raw);
    if (!expectedPid || Number.isNaN(expectedPid) || currentPid === expectedPid) {
      fs.rmSync(PID_FILE, { force: true });
    }
  } catch {
    // ignore
  }
}

function psCommand(pid) {
  try {
    const out = execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.trim();
  } catch {
    return '';
  }
}

function lsofPidsOnPort(port) {
  try {
    const out = execFileSync('lsof', ['-tiTCP:' + String(port), '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (!out) return [];
    return out
      .split(/\s+/)
      .map((s) => Number(s))
      .filter((n) => n && !Number.isNaN(n));
  } catch {
    return [];
  }
}

async function killPid(pid, reason) {
  if (!isProcessAlive(pid)) return false;

  if (reason) {
    console.log(`Stopping backend (PID ${pid})${reason ? `: ${reason}` : ''}`);
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }

  for (let i = 0; i < 10; i += 1) {
    await sleep(150);
    if (!isProcessAlive(pid)) return true;
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }

  for (let i = 0; i < 10; i += 1) {
    await sleep(150);
    if (!isProcessAlive(pid)) return true;
  }

  return !isProcessAlive(pid);
}

(async () => {
  const pidFromFile = tryReadPidFile();
  let stoppedAny = false;

  if (pidFromFile && isProcessAlive(pidFromFile)) {
    stoppedAny = (await killPid(pidFromFile, 'from PID file')) || stoppedAny;
    safeRemovePidFile(pidFromFile);
  } else if (pidFromFile) {
    safeRemovePidFile(pidFromFile);
  }

  // If no PID file, try to find a backend listener on the port.
  // To avoid killing unrelated processes, only stop processes whose command looks like this repo's backend.
  if (!stoppedAny) {
    const pids = lsofPidsOnPort(PORT);
    for (const pid of pids) {
      const cmd = psCommand(pid);
      const looksLikeBackend = /\bnode\b/.test(cmd) && (cmd.includes('backend/server.js') || cmd.endsWith('server.js'));

      if (!looksLikeBackend) {
        console.warn(`Port ${PORT} is in use by PID ${pid}: ${cmd || '(unknown command)'}`);
        console.warn('Refusing to stop it automatically. Free the port or change PORT in backend/.env.');
        process.exitCode = 1;
        return;
      }

      stoppedAny = (await killPid(pid, 'from port listener')) || stoppedAny;
    }
  }

  if (stoppedAny) {
    console.log(`Backend stopped (port ${PORT} should be free).`);
  } else {
    console.log('Backend already stopped.');
  }
})();
