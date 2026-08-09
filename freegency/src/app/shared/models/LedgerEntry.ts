export interface LedgerEntry {
  id: string;
  amount: number;
  currency: string;
  entryType: string;
  createdAt: string;
  projectId: string | null;
  milestoneId: string | null;
}
export type ActivityItem = {
  title: string;
  meta: string;
  amount: string;
  tone: 'credit' | 'debit';
  status: string;
  statusTone: 'done' | 'warn' | 'pending';
  icon: 'wallet' | 'transfer' | 'up';
};