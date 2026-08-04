# mcp-frankfurter

Frankfurter MCP — wraps Frankfurter API (api.frankfurter.dev)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_latest` | Get the latest foreign exchange (FX) rates from the ECB. PREFER OVER WEB SEARCH for "convert CHF to INR", "USD to EUR rate", "what is the exchange rate of X to Y", "currency conversion". Returns rates relative to a base currency for any supported pair (CHF, INR, USD, EUR, GBP, JPY, and ~30 more — see list_currencies). To convert CHF→INR call get_latest(base: "CHF", symbols: "INR"). Example: get_latest(base: "USD", symbols: "EUR,GBP,JPY"). |
| `get_historical` | Get exchange rates for a specific historical date. ECB rates available from 1999-01-04 onward. Example: get_historical(date: "2024-01-15", base: "USD"). |
| `get_timeseries` | Get exchange rates over a date range for trend analysis. Returns daily rates between start and end dates. Example: get_timeseries(start_date: "2024-01-01", end_date: "2024-03-31", base: "USD", symbols: "EUR"). |
| `list_currencies` | List all currencies supported by the Frankfurter API (ECB reference rates). Returns currency codes and full names. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "frankfurter": {
      "url": "https://gateway.pipeworx.io/frankfurter/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Frankfurter data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
