# @hookkit/sdk

TypeScript client for the [HookKit API](https://docs.hookkit.dev): the developer
infrastructure for programmable liquidity. Uniswap v4 hooks and pools on
Robinhood Chain (chain ID 4663).

- Inspect and decode any v4 hook's permissions
- Mine CREATE2 salts for hook addresses
- Read indexed pools and live pool state
- Quote through hooks with the onchain V4Quoter
- Build unsigned Permit2 + UniversalRouter swap transactions

Non-custodial: HookKit never holds keys, signs, or submits transactions. Zero
dependencies; works anywhere `fetch` does.

## Install

```bash
npm install @hookkit/sdk
```

## Usage

```ts
import { HookKit, HookKitError } from "@hookkit/sdk"

const hookkit = new HookKit() // https://api.hookkit.dev, no API key

const ETH = "0x0000000000000000000000000000000000000000"
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"

// Hooks
const hook = await hookkit.hooks.get("0x4e3468951D49f2EEa976eD0D6e75fFCb44a9a544")
hook.capabilities // [{ level: "warning", flag: "afterSwapReturnDelta", note: "..." }, ...]
hook.code         // { deployed: true, codeSize: 25533, proxy: null, ... }

const { hooks } = await hookkit.hooks.list({ sort: "pools", limit: 25 })
const decoded = await hookkit.hooks.decode("0x48B8F6AD3A1b4aA477314c9a23035b8F84dDe8cc")

// Mine a salt for a hook with beforeSwap + afterSwap
const mined = await hookkit.hooks.mine({ flags: ["beforeSwap", "afterSwap"], initCodeHash: "0x..." })

// Pools
const poolId = "0x387bf619da4d3fb62bb276482693dba1b9b3520f573cabdfe033384a24125982" // ETH/USDG 0.05%
const pool = await hookkit.pools.get({ poolId })
const { pools } = await hookkit.pools.list({ hooked: true, limit: 10 })
const { total } = await hookkit.pools.list({ tokenA: ETH, tokenB: USDG }) // every pool for one pair
const id = await hookkit.pools.id({
  currency0: "0x0000000000000000000000000000000000000000",
  currency1: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  fee: 500,
  tickSpacing: 10,
})

// Best pool for a pair: quotes the deepest pools through their hooks, ranked
const best = await hookkit.bestQuote({ tokenIn: ETH, tokenOut: USDG, amount: "0.1" })
best.best    // { poolId, amountOut, vsSpotPct, hook: { warnings }, ... }
best.routes  // every quoted pool, best first

// Safety brief before trading or providing liquidity
const check = await hookkit.pools.check({ poolId: best.best.poolId, tokenIn: ETH, amount: "0.1" })
check.risk   // { level: "medium", reasons: ["Hook can set its own swap price (beforeSwapReturnDelta)", ...] }

// Quote one pool (runs the hook) and build an unsigned swap
const quote = await hookkit.quote({ poolId, tokenIn: "0x0000000000000000000000000000000000000000", amount: "0.01" })
const swap = await hookkit.swap.build({
  poolId,
  tokenIn: "0x0000000000000000000000000000000000000000",
  amount: "0.01",
  sender: "0xYourWalletAddress",
  slippageBps: 50,
})
// swap.transactions: [{ to, data, value, description }, ...] sent in order from `sender`

// Index totals and v4 contract addresses
const stats = await hookkit.stats()
```

### Offline helpers

```ts
import { decodeHookAddress, flagsFor, FLAG_BITS, ALL_HOOK_MASK, DYNAMIC_FEE_FLAG } from "@hookkit/sdk"

decodeHookAddress("0x4e3468951D49f2EEa976eD0D6e75fFCb44a9a544")
// { flags: 0x2544, enabled: ["beforeInitialize", "afterAddLiquidity", ...], permissions: {...} }

flagsFor(["beforeSwap", "afterSwap"]) // 0xc0
FLAG_BITS.beforeInitialize            // 0x2000
ALL_HOOK_MASK                         // 0x3fff
DYNAMIC_FEE_FLAG                      // 0x800000
```

### Errors

Non-2xx responses throw `HookKitError` with `status`, `code`, and `message`:

```ts
try {
  await hookkit.quote({ poolId, amount: "1000000" })
} catch (e) {
  if (e instanceof HookKitError && e.code === "no_route") {
    // the pool or its hook rejected the swap
  }
}
```

Codes: `bad_request`, `not_found`, `invalid_flags`, `no_route`,
`index_unavailable`, `internal_error`.

### Options

```ts
new HookKit({
  baseUrl: "https://api.hookkit.dev", // default
  fetch: customFetch,                  // default: globalThis.fetch
  headers: { "x-client": "my-app" },
})
```

## Links

- Docs: https://docs.hookkit.dev
- API: https://api.hookkit.dev
- MCP server: https://api.hookkit.dev/mcp

## License

MIT
