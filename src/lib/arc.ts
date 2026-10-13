import { createPublicClient, defineChain, formatEther, http, parseAbi } from 'viem'
import { arcContracts as CONTRACTS, arcExplorer } from '../content'

// Read-only view of PredictArc on Arc mainnet, straight from the chain (no backend).
// Same contracts, RPC and ABI as the PredictArc app; USDC is Arc's native gas token (18 decimals).
const arc = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
  blockExplorers: { default: { name: 'Arc Explorer', url: arcExplorer } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const client = createPublicClient({ chain: arc, transport: http(undefined, { batch: false }) })

const abi = parseAbi([
  'function marketCount() view returns (uint256)',
  'function getMarket(uint256) view returns ((string question, string category, string rules, uint256 deadline, uint256 yesPool, uint256 noPool, bool outcome, uint8 status, address creator))',
])

export type ArcStats = { markets: number; open: number; pooled: number; nextClose: number | null; block: number }

// Market ids run 1..marketCount on both contracts; one multicall per contract. V3 re-listed V2's
// markets when it shipped, so markets are counted once per question; pools are summed across both.
export async function fetchStats(): Promise<ArcStats> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const all = new Set<string>()
  const live = new Set<string>()
  let pooled = 0n
  let nextClose: bigint | null = null
  for (const { address } of CONTRACTS) {
    const n = Number(await client.readContract({ address, abi, functionName: 'marketCount' }))
    const rows = await client.multicall({
      contracts: Array.from({ length: n }, (_, i) => ({ address, abi, functionName: 'getMarket' as const, args: [BigInt(i + 1)] as const })),
      allowFailure: true,
    })
    for (const r of rows) {
      if (r.status !== 'success') continue
      const m = r.result
      all.add(m.question)
      pooled += m.yesPool + m.noPool
      if (m.status === 0 && m.deadline > now) {
        live.add(m.question)
        if (nextClose === null || m.deadline < nextClose) nextClose = m.deadline
      }
    }
  }
  const block = Number(await client.getBlockNumber())
  return {
    markets: all.size,
    open: live.size,
    pooled: Number(formatEther(pooled)),
    nextClose: nextClose === null ? null : Math.max(0, Math.ceil(Number(nextClose - now) / 86400)),
    block,
  }
}
