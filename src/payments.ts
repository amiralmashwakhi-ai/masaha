// Escrow gateway interface. Mocked until a licensed Jordanian payment provider is chosen and connected.
export interface EscrowGateway {
  hold(jobId: string, amountJod: number): Promise<{ ref: string }>;
  release(jobId: string, amountJod: number): Promise<void>;
  refund(jobId: string, amountJod: number): Promise<void>;
}

export const mockGateway: EscrowGateway = {
  async hold(jobId) { return { ref: `MOCK-${jobId}` }; },
  async release() {},
  async refund() {},
};
