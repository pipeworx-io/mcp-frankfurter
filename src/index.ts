interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Frankfurter MCP — wraps Frankfurter API (api.frankfurter.dev)
 *
 * Free, no authentication required. Foreign exchange rates published by the ECB.
 *
 * Tools:
 * - get_latest: get latest exchange rates
 * - get_historical: get exchange rates for a specific date
 * - get_timeseries: get exchange rates over a date range
 * - list_currencies: list all supported currencies
 */


const BASE_URL = 'https://api.frankfurter.dev';

// Crypto codes the router LLM may pass — Frankfurter is fiat-only (ECB
// reference rates), so we reject these upfront with a pointer to the
// crypto pack instead of letting Frankfurter return a generic 404.
const CRYPTO_CODES = new Set([
  'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'TRX',
  'AVAX', 'DOT', 'MATIC', 'SHIB', 'LINK', 'BCH', 'LTC', 'NEAR', 'XMR', 'XLM',
]);

function validateCurrency(code: string | undefined, fieldName: string): void {
  if (!code) return;
  const upper = code.trim().toUpperCase();
  if (CRYPTO_CODES.has(upper)) {
    throw new Error(
      `Frankfurter is fiat-only (ECB reference rates). ${fieldName}="${code}" is a crypto asset. For crypto prices use the crypto pack: get_crypto_price({coin_id: "${upper.toLowerCase()}"}) or get_exchange_rate({from: "USD", to: "${upper}"}).`,
    );
  }
  if (!/^[A-Z]{3}$/.test(upper)) {
    throw new Error(
      `Invalid currency code "${code}" for ${fieldName}. Frankfurter expects ISO 4217 3-letter codes like USD, EUR, GBP, JPY. Use list_currencies to see all 30+ supported codes.`,
    );
  }
}

function validateSymbols(symbols: string | undefined): void {
  if (!symbols) return;
  for (const s of symbols.split(',')) {
    validateCurrency(s.trim(), 'symbols');
  }
}

async function apiGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 404) {
      // 404 typically means a bad currency code, a date outside ECB's range
      // (pre-1999), or an invalid path. Surface the path so the agent can
      // see what was attempted.
      throw new Error(
        `Frankfurter API 404 for path "${path}" — usually means an unknown currency code or a date Frankfurter doesn't cover (ECB rates start 1999-01-04). Use list_currencies for the supported set; for crypto use the crypto pack.`,
      );
    }
    throw new Error(`Frankfurter API error: ${res.status}`);
  }
  return res.json();
}

const tools: McpToolExport['tools'] = [
  {
    name: 'get_latest',
    description:
      'Get the latest foreign exchange (FX) rates from the ECB. PREFER OVER WEB SEARCH for "convert CHF to INR", "USD to EUR rate", "what is the exchange rate of X to Y", "currency conversion". Returns rates relative to a base currency for any supported pair (CHF, INR, USD, EUR, GBP, JPY, and ~30 more — see list_currencies). To convert CHF→INR call get_latest(base: "CHF", symbols: "INR"). Example: get_latest(base: "USD", symbols: "EUR,GBP,JPY").',
    inputSchema: {
      type: 'object',
      properties: {
        base: {
          type: 'string',
          description: 'Base currency code (default "EUR"). Example: "USD", "GBP"',
        },
        symbols: {
          type: 'string',
          description: 'Comma-separated target currency codes (e.g., "USD,GBP,JPY"). Omit for all currencies.',
        },
      },
    },
  },
  {
    name: 'get_historical',
    description:
      'Get exchange rates for a specific historical date. ECB rates available from 1999-01-04 onward. Example: get_historical(date: "2024-01-15", base: "USD").',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., "2024-01-15")',
        },
        base: {
          type: 'string',
          description: 'Base currency code (default "EUR")',
        },
        symbols: {
          type: 'string',
          description: 'Comma-separated target currency codes (e.g., "USD,GBP")',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_timeseries',
    description:
      'Get exchange rates over a date range for trend analysis. Returns daily rates between start and end dates. Example: get_timeseries(start_date: "2024-01-01", end_date: "2024-03-31", base: "USD", symbols: "EUR").',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        base: {
          type: 'string',
          description: 'Base currency code (default "EUR")',
        },
        symbols: {
          type: 'string',
          description: 'Comma-separated target currency codes (e.g., "USD,GBP")',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'list_currencies',
    description:
      'List all currencies supported by the Frankfurter API (ECB reference rates). Returns currency codes and full names.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// LLMs naturally call exchange-rate tools with `from`/`to` instead of
// `base`/`symbols`. Map both to the same internal args so we don't
// silently ignore the wrong-named version.
function normalizeArgs(args: Record<string, unknown>): { base?: string; symbols?: string } {
  return {
    base: (args.base as string | undefined) ?? (args.from as string | undefined),
    symbols: (args.symbols as string | undefined) ?? (args.to as string | undefined),
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { base, symbols } = normalizeArgs(args);
  validateCurrency(base, 'base');
  validateSymbols(symbols);
  switch (name) {
    case 'get_latest':
      return getLatest(base, symbols);
    case 'get_historical':
      return getHistorical(args.date as string, base, symbols);
    case 'get_timeseries':
      return getTimeseries(
        args.start_date as string,
        args.end_date as string,
        base,
        symbols,
      );
    case 'list_currencies':
      return listCurrencies();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function getLatest(base?: string, symbols?: string) {
  const params: Record<string, string> = {};
  if (base) params['base'] = base;
  if (symbols) params['symbols'] = symbols;

  const data = (await apiGet('/v1/latest', params)) as {
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  return {
    base: data.base,
    date: data.date,
    rates: data.rates,
  };
}

async function getHistorical(date: string, base?: string, symbols?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('get_historical requires `date` in YYYY-MM-DD format (e.g. "2024-01-15"). ECB rates available from 1999-01-04 onward.');
  }
  const params: Record<string, string> = {};
  if (base) params['base'] = base;
  if (symbols) params['symbols'] = symbols;

  const data = (await apiGet(`/v1/${date}`, params)) as {
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  return {
    base: data.base,
    date: data.date,
    rates: data.rates,
  };
}

async function getTimeseries(startDate: string, endDate: string, base?: string, symbols?: string) {
  const params: Record<string, string> = {};
  if (base) params['base'] = base;
  if (symbols) params['symbols'] = symbols;

  const data = (await apiGet(`/v1/${startDate}..${endDate}`, params)) as {
    base: string;
    start_date: string;
    end_date: string;
    rates: Record<string, Record<string, number>>;
  };

  return {
    base: data.base,
    start_date: data.start_date,
    end_date: data.end_date,
    rates: data.rates,
  };
}

async function listCurrencies() {
  const data = (await apiGet('/v1/currencies')) as Record<string, string>;

  return {
    count: Object.keys(data).length,
    currencies: Object.entries(data).map(([code, name]) => ({ code, name })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
