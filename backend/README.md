# Intraday backend

Read-only market data server for the Intraday Signal Desk. It serves one-minute to 30-minute candles for ten NSE stocks, from Upstox when connected and from generated prices otherwise. It has no route that places, changes or cancels an order.

No packages to install. Needs Node 20 or newer.

## Run it

```
cp .env.example .env     # then edit .env
npm start                # http://127.0.0.1:3000
npm test
```

With an empty `.env` it runs on simulated prices. Every response says which source it used, so generated prices are never shown as live.

## Connect Upstox

1. On the Upstox developer console, create an app. Set its redirect URL to `http://127.0.0.1:3000/auth/upstox/callback` (or your hosted address).
2. Put the app's API key and secret in `.env` as `UPSTOX_API_KEY` and `UPSTOX_API_SECRET`. Keep the secret on the server only.
3. Restart, then open `/auth/upstox/login` in your browser and sign in on Upstox.
4. Check `/api/health`. `upstoxConnected` should read `true`.

Upstox access tokens expire at 3:30 AM IST each day, so repeat step 3 every trading morning. Automating that login is a later step.

## Endpoints

| Route | What it returns |
| --- | --- |
| `GET /api/health` | Data source, whether Upstox is connected, token expiry, `ordersEnabled: false` |
| `GET /api/symbols` | The ten watchlist stocks |
| `GET /api/candles?symbol=TCS&interval=1&date=today` | Candles `{ t, o, h, l, c, v }`, oldest first, `t` in epoch milliseconds. `interval` is 1, 5, 15 or 30 minutes. `date` is `today` or `YYYY-MM-DD`. |
| `GET /auth/upstox/login` | Starts the Upstox sign-in |

`DATA_SOURCE` in `.env`: `auto` uses Upstox when connected and falls back to simulated data with a `note` in the response. `upstox` refuses with an error instead of falling back. `simulated` never calls Upstox.

If Upstox is connected but a request fails, the server returns the error. It does not quietly swap in simulated prices.

## Before you rely on it

- **Instrument keys.** `src/config.js` maps each stock to an `NSE_EQ|ISIN` key from memory. Check each one against Upstox's instrument list.
- **Login URL.** The sign-in address in `src/adapters/upstox.js` is written from memory, because the page that documents it was not reachable while building this. Check it against Upstox's authorization docs. If sign-in fails, start there.
- **Candle endpoints.** These follow Upstox's v3 pages (the v2 ones are marked deprecated). They were checked against the docs but never called with a real token.
- **Rate limits and data terms.** Check Upstox's current API terms. Results are cached for 15 seconds (today) and 6 hours (past days) to stay light.
- **Hosting.** The server listens on `127.0.0.1` only. Before putting it on a public address, add authentication: it serves data using your Upstox login.
- **Compliance.** Signals and trade ideas for others, and any order routing, bring SEBI and exchange rules. Take advice before going beyond personal use.
