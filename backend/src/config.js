import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader so the project needs no packages. Real environment variables win.
function loadEnv() {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || m[1].startsWith('#')) continue;
    let v = m[2];
    if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnv();

const port = Number(process.env.PORT || 3000);

export const config = {
  port,
  host: process.env.HOST || '127.0.0.1',
  dataSource: process.env.DATA_SOURCE || 'auto', // auto | upstox | simulated
  allowOrigin: process.env.ALLOW_ORIGIN || '',
  upstox: {
    baseUrl: 'https://api.upstox.com',
    apiKey: process.env.UPSTOX_API_KEY || '',
    apiSecret: process.env.UPSTOX_API_SECRET || '',
    redirectUri: process.env.UPSTOX_REDIRECT_URI || `http://127.0.0.1:${port}/auth/upstox/callback`,
    accessToken: process.env.UPSTOX_ACCESS_TOKEN || ''
  }
};

// instrumentKey is NSE_EQ|<ISIN>. Check each one against Upstox's instrument list before relying on it.
// base and vol only feed the simulated adapter.
export const SYMBOLS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries',       instrumentKey: 'NSE_EQ|INE002A01018', base: 1420, vol: 0.00072 },
  { symbol: 'TCS',        name: 'Tata Consultancy Services', instrumentKey: 'NSE_EQ|INE467B01029', base: 3150, vol: 0.00062 },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank',                 instrumentKey: 'NSE_EQ|INE040A01034', base: 1010, vol: 0.00060 },
  { symbol: 'INFY',       name: 'Infosys',                   instrumentKey: 'NSE_EQ|INE009A01021', base: 1580, vol: 0.00070 },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank',                instrumentKey: 'NSE_EQ|INE090A01021', base: 1360, vol: 0.00066 },
  { symbol: 'SBIN',       name: 'State Bank of India',       instrumentKey: 'NSE_EQ|INE062A01020', base: 880,  vol: 0.00082 },
  { symbol: 'ITC',        name: 'ITC',                       instrumentKey: 'NSE_EQ|INE154A01025', base: 420,  vol: 0.00058 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel',             instrumentKey: 'NSE_EQ|INE397D01024', base: 1950, vol: 0.00068 },
  { symbol: 'LT',         name: 'Larsen & Toubro',           instrumentKey: 'NSE_EQ|INE018A01030', base: 3650, vol: 0.00074 },
  { symbol: 'AXISBANK',   name: 'Axis Bank',                 instrumentKey: 'NSE_EQ|INE238A01034', base: 1180, vol: 0.00080 }
];
