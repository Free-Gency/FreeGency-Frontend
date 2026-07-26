export interface Wallet {
  id: string;
  userId: string;
  currency: string;
  available: number;
  reserved: number;
  pending: number;
}
export interface TopUpResponse {

  clientSecret: string;

  paymentIntentId: string;

}