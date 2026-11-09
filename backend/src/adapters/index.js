import { config } from '../config.js';
import { createSimulatedAdapter } from './simulated.js';
import { createUpstoxAdapter } from './upstox.js';

export const simulated = createSimulatedAdapter();
export const upstox = createUpstoxAdapter();

// Chooses where candles come from. The caller reports `source` in every response so the
// dashboard can never show generated prices as if they were live.
export function pickAdapter() {
  const mode = config.dataSource;
  if (mode === 'simulated') return { adapter: simulated };
  if (upstox.isReady()) return { adapter: upstox };
  if (mode === 'upstox') return { error: 'Upstox is not connected. Open /auth/upstox/login to connect.' };
  return { adapter: simulated, fallbackReason: 'Upstox is not connected, so these prices are simulated.' };
}
