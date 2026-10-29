// @hookkit/sdk: TypeScript client for the HookKit API, the developer
// infrastructure for Uniswap v4 hooks on Robinhood Chain.
//
//   const hookkit = new HookKit()
//   const hook = await hookkit.hooks.get("0x4e34...a544")
//   const quote = await hookkit.quote({ poolId, tokenIn, amount: "0.01" })

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export const HOOK_FLAGS = [
  "beforeInitialize",
  "afterInitialize",
  "beforeAddLiquidity",
  "afterAddLiquidity",
  "beforeRemoveLiquidity",
  "afterRemoveLiquidity",
  "beforeSwap",
  "afterSwap",
  "beforeDonate",
  "afterDonate",
  "beforeSwapReturnDelta",
  "afterSwapReturnDelta",
  "afterAddLiquidityReturnDelta",
  "afterRemoveLiquidityReturnDelta",
] as const;
export type HookFlag = (typeof HOOK_FLAGS)[number];
export type Permissions = Record<HookFlag, boolean>;

/** Bit value of each flag: beforeInitialize = 1 << 13 ... afterRemoveLiquidityReturnDelta = 1 << 0. */
export const FLAG_BITS = Object.fromEntries(HOOK_FLAGS.map((f, i) => [f, 1 << (13 - i)])) as Record<HookFlag, number>;
export const ALL_HOOK_MASK = 0x3fff;
export const DYNAMIC_FEE_FLAG = 0x800000;

/** Decodes the permissions encoded in a hook address, offline. */
export function decodeHookAddress(address: string): { flags: number; enabled: HookFlag[]; permissions: Permissions } {
  const flags = Number(BigInt(address) & BigInt(ALL_HOOK_MASK));
  const permissions = Object.fromEntries(HOOK_FLAGS.map((f) => [f, (flags & FLAG_BITS[f]) !== 0])) as Permissions;
  return { flags, enabled: HOOK_FLAGS.filter((f) => permissions[f]), permissions };
}

/** Bitmask for a list of permissions, e.g. flagsFor(["beforeSwap", "afterSwap"]) === 0xc0. */
export function flagsFor(permissions: HookFlag[]): number {
  return permissions.reduce((bits, f) => bits | FLAG_BITS[f], 0);
}

// --- Response types ----------------------------------------------------------

export type PoolKey = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
export type Token = { address: Address; symbol: string | null; name?: string; decimals: number | null };

export type Capability = { level: "info" | "caution" | "warning"; flag: string; note: string };

export type HookDecoded = {
  address: Address;
  flags: number;
  flagsHex: Hex;
  enabled: HookFlag[];
  permissions: Permissions;
  errors: string[];
  capabilities: Capability[];
};

export type PoolSummary = {
  poolId: Hex;
  key: PoolKey;
  pair: string;
  currency0: Token;
  currency1: Token;
  hooked: boolean;
  dynamicFee: boolean;
  createdBlock: number;
  createdAt: string | null;
  txHash: Hex;
};

export type HookProfile = HookDecoded & {
  chain: string;
  explorer: string;
  code:
    | { deployed: false; codeSize: 0 }
    | {
        deployed: true;
        codeSize: number;
        codeHash: Hex;
        proxy: { kind: "eip1967" | "eip1167"; implementation: Address; admin: Address | null; upgradeable: boolean } | null;
      };
  warnings: string[];
  pools: { total: number; recent: PoolSummary[] } | null;
};

export type HookListItem = {
  address: Address;
  flags: Hex;
  enabled: HookFlag[];
  pools: number;
  firstSeenBlock: number;
  lastPoolBlock: number;
  warnings: string[];
};

export type Pool = {
  poolId: Hex;
  key: PoolKey;
  currency0: Token;
  currency1: Token;
  dynamicFee: boolean;
  hooked: boolean;
  state: {
    initialized: boolean;
    sqrtPriceX96: string;
    tick: number;
    liquidity: string;
    lpFee: number;
    lpFeePercent: number;
    protocolFee: number;
  };
  price: Record<string, number>;
  hook: { address: Address; enabled: HookFlag[]; capabilities: Capability[] } | null;
  created: { block: number; txHash: Hex; at: string | null } | null;
};

export type Quote = {
  poolId: Hex;
  zeroForOne: boolean;
  exactOut: boolean;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  amountInRaw: string;
  amountOutRaw: string;
  executionPrice: number;
  gasEstimate: string;
  hooked: boolean;
};

export type UnsignedTx = { to: Address; data: Hex; value: string; description: string };

export type SwapBuild = {
  chainId: number;
  poolId: Hex;
  sender: Address;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  expectedAmountOut: string;
  minAmountOut: string;
  slippageBps: number;
  deadline: number;
  transactions: UnsignedTx[];
  note: string;
};

export type Route = {
  poolId: Hex;
  key: PoolKey;
  fee: string;
  currentLpFee: string;
  hook: { address: Address; enabled: HookFlag[]; warnings: string[] } | null;
  amountOut: string;
  amountOutRaw: string;
  spotAmountOut: number;
  vsSpotPct: number | null;
  gasEstimate: string;
};

export type BestQuote = {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  best: Route;
  routes: Route[];
  considered: { pairPools: number; initialized: number; quoted: number; failed: number };
  note: string;
};

export type PoolCheck = {
  poolId: Hex;
  pair: string;
  key: PoolKey;
  fee: string;
  currentLpFee: string;
  liquidity: string;
  hook: { address: Address; enabled: HookFlag[]; code: HookProfile["code"] | null } | null;
  quoteCheck: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    spotAmountOut: number;
    vsSpotPct: number | null;
  } | null;
  risk: { level: "low" | "medium" | "high"; reasons: string[] };
  note: string;
};

export type MineResult =
  | {
      found: true;
      salt: Hex;
      address: Address;
      iterations: number;
      flags: number;
      flagsHex: Hex;
      deployer: Address;
      initCodeHash: Hex;
      verify: boolean;
      note: string;
    }
  | { found: false; iterations: number; nextSalt: string; flags: number; note: string };

export type Stats = {
  chain: { id: number; name: string; explorer: string; contracts: Record<string, Address> };
  index: {
    pools: number;
    hookedPools: number;
    uniqueHooks: number;
    tokens: number;
    indexedThroughBlock: number | null;
    headBlock: number | null;
  } | null;
};

// --- Request types -----------------------------------------------------------

/** Identify a pool by id (looked up in the HookKit index) or by its full key. */
export type PoolRef = { poolId: Hex } | { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks?: Address };

export type SwapDirection = { tokenIn?: Address; zeroForOne?: boolean };

export type QuoteParams = PoolRef & SwapDirection & { amount: string; exactOut?: boolean; hookData?: Hex };
export type BuildSwapParams = PoolRef &
  SwapDirection & { amount: string; sender: Address; slippageBps?: number; hookData?: Hex };

export type MineParams = {
  flags: HookFlag[] | number;
  initCodeHash?: Hex;
  initCode?: Hex;
  deployer?: Address;
  startSalt?: string;
  maxIterations?: number;
};

// --- Client ------------------------------------------------------------------

export class HookKitError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "HookKitError";
  }
}

export type HookKitOptions = { baseUrl?: string; fetch?: typeof fetch; headers?: Record<string, string> };

export class HookKit {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;

  constructor(opts: HookKitOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://api.hookkit.dev").replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.headers = opts.headers ?? {};
  }

  private async request<T>(method: "GET" | "POST", path: string, params?: Record<string, unknown>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers: { accept: "application/json", ...this.headers } };
    if (method === "GET" && params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.set(k, String(v));
      const s = qs.toString();
      if (s) url += `?${s}`;
    } else if (method === "POST") {
      init.body = JSON.stringify(params ?? {});
      (init.headers as Record<string, string>)["content-type"] = "application/json";
    }
    const res = await this.fetchImpl(url, init);
    const body = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      throw new HookKitError(res.status, body?.error?.code ?? "http_error", body?.error?.message ?? `HTTP ${res.status}`);
    }
    return body as T;
  }

  readonly hooks = {
    /** Full profile of a deployed hook: permissions, bytecode, proxy, warnings, pools. */
    get: (address: Address) => this.request<HookProfile>("GET", `/v1/hooks/${address}`),
    /** Permissions encoded in any address (no chain call). */
    decode: (address: Address) => this.request<HookDecoded>("GET", `/v1/hooks/${address}/flags`),
    /** Every hook used by a v4 pool on Robinhood Chain. */
    list: (params: { sort?: "pools" | "recent"; limit?: number; offset?: number } = {}) =>
      this.request<{ total: number; limit: number; offset: number; hooks: HookListItem[] }>("GET", "/v1/hooks", params),
    /** Mine a CREATE2 salt for a hook address with the given permissions. */
    mine: (params: MineParams) => this.request<MineResult>("POST", "/v1/hooks/mine", params),
  };

  readonly pools = {
    /** Live pool state by id or key. */
    get: (ref: PoolRef) =>
      "poolId" in ref ? this.request<Pool>("GET", `/v1/pools/${ref.poolId}`) : this.request<Pool>("POST", "/v1/pools/state", ref),
    list: (
      params: { hook?: Address; token?: Address; tokenA?: Address; tokenB?: Address; hooked?: boolean; limit?: number; offset?: number } = {}
    ) =>
      this.request<{ total: number; limit: number; offset: number; pools: PoolSummary[] }>("GET", "/v1/pools", params),
    /** Safety brief: risk level and reasons from hook permissions, bytecode, and (with amount) a live quote vs spot. */
    check: (ref: PoolRef & { tokenIn?: Address; amount?: string; hookData?: Hex }) =>
      this.request<PoolCheck>("POST", "/v1/pools/check", ref),
    /** PoolId for a key (currencies are sorted for you). */
    id: (key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks?: Address }) =>
      this.request<{ poolId: Hex; key: PoolKey; sorted: boolean }>("POST", "/v1/pools/id", key),
  };

  /** Quote through the pool's hook via the V4Quoter. */
  quote(params: QuoteParams) {
    return this.request<Quote>("POST", "/v1/quote", params);
  }

  /** Best pool for a pair: quotes the deepest pools through their hooks and ranks them. */
  bestQuote(params: { tokenIn: Address; tokenOut: Address; amount: string; limit?: number }) {
    return this.request<BestQuote>("GET", "/v1/quote/best", params);
  }

  readonly swap = {
    /** Unsigned approval + UniversalRouter transactions; sign them with your own wallet. */
    build: (params: BuildSwapParams) => this.request<SwapBuild>("POST", "/v1/swap/build", params),
  };

  stats() {
    return this.request<Stats>("GET", "/v1/stats");
  }
}

export default HookKit;
