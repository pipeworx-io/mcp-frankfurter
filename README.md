# mcp-frankfurter

Frankfurter MCP — wraps Frankfurter API (api.frankfurter.dev)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

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

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/frankfurter/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Frankfurter data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
