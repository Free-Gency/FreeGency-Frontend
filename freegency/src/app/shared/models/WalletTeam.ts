export interface WalletTeam {
  id: string;
  teamId: string;
  currency: string;
  available: number;
  reserved: number;
  pending: number;
  totalEarnings: number;
}