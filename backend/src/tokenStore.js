import fs from 'node:fs';
import path from 'node:path';
import { config, root } from './config.js';
import { nextTokenExpiryMs } from './time.js';

// Holds the Upstox access token in memory and in data/token.json (owner-only file, git-ignored).
// The token is never logged and never sent to the browser.
const dir = path.join(root, 'data');
const file = path.join(dir, 'token.json');

let state = { token: '', expiresAt: 0 };

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved.token && saved.expiresAt > Date.now()) state = saved;
  } catch { /* no saved token */ }
  if (!state.token && config.upstox.accessToken) {
    state = { token: config.upstox.accessToken, expiresAt: nextTokenExpiryMs() };
  }
}
load();

export const tokenStore = {
  get() {
    if (state.token && state.expiresAt <= Date.now()) state = { token: '', expiresAt: 0 };
    return state.token;
  },
  expiresAt() { return this.get() ? state.expiresAt : 0; },
  set(token, issuedMs = Date.now()) {
    state = { token, expiresAt: nextTokenExpiryMs(issuedMs) };
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(state), { mode: 0o600 });
    } catch { /* keep the in-memory token even if the disk write fails */ }
  },
  clear() {
    state = { token: '', expiresAt: 0 };
    try { fs.rmSync(file, { force: true }); } catch { /* nothing to remove */ }
  }
};
