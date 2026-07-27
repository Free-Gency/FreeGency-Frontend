
export interface ProjectEscrow {
  id: string;
  projectId: string;
  totalAmount: number;
  totalReleased: number;
  remaining: number;
  fundingStatus: string;
  planStatus: string;
  lockedAt: string | null;
  planAgreedAt: string | null;
}