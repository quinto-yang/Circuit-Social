export type ChainType = "evm" | "solana";

export type NonceIntent = "login" | "bind";

export type NonceRequest = {
  address: string;
  chainId: number;
  intent: NonceIntent;
};

export interface ChainAdapter {
  readonly chainType: ChainType;
  supportsChain(chainId: number): boolean;
  normalizeAddress(address: string): string;
  validateAddress(address: string): boolean;
}
