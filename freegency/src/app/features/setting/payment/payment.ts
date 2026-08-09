import { CurrencyPipe } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowUp01Icon,
  Money01Icon,
  SecurityCheckIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment.development';
import { Wallet } from '../../../shared/models/Wallet';
import { ToastService } from '../../../shared/services/toast.service';
import { PaymentService } from '../Data-Access/payment-service';
import { SignalrService } from '../../../core/Signalr/signalr-service';
import { ActivityItem, LedgerEntry } from '../../../shared/models/LedgerEntry';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, HugeiconsIconComponent],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment implements OnInit {
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);

  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly moneyIcon = Money01Icon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly upIcon = ArrowUp01Icon as IconSvgObject;
  protected readonly transferIcon = ArrowDataTransferHorizontalIcon as IconSvgObject;
  protected readonly shieldIcon = SecurityCheckIcon as IconSvgObject;
  signalrService = inject(SignalrService);
  public wallet = signal<Wallet | null>(null);
  constructor() {
    effect(() => {
      this.wallet.set(this.signalrService.WalletSignal());
    });
  }
  topUpAmount = 0;
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  /** Stripe payment form is expanded after Top Up. */
  protected readonly paymentFormOpen = signal(false);
  /** True when Stripe reports the selected payment method fields are complete. */
  protected readonly paymentFormComplete = signal(false);
  protected readonly paying = signal(false);

  /** Static UI placeholders — replace when transactions API is ready. */
protected readonly activity = signal<ActivityItem[]>([]);
protected readonly ledgerLoading = signal(false);
 async ngOnInit(): Promise<void> {
    this.stripe = await loadStripe(environment.stripePublicKey);
    this.loadWallet();
    this.loadLedger();
  }
loadLedger(): void {
  this.ledgerLoading.set(true);

  this.paymentService.getLedger(1, 3).subscribe({
    next: (result) => {
      this.activity.set(
        result.items.map((entry) => this.mapLedgerToActivity(entry))
      );

      this.ledgerLoading.set(false);
    },
    error: (err) => {
      console.error(err);
      this.ledgerLoading.set(false);
    },
  });
}
private mapLedgerToActivity(entry: LedgerEntry): ActivityItem {
  const isCredit = entry.amount > 0;

  return {
    title: this.getActivityTitle(entry),
    meta: this.getActivityMeta(entry),
    amount: `${isCredit ? '+' : ''}${entry.currency} ${Math.abs(entry.amount).toLocaleString()}`,
    tone: isCredit ? 'credit' : 'debit',
    status: this.getActivityStatus(entry),
    statusTone: this.getActivityStatusTone(entry),
    icon: this.getActivityIcon(entry),
  };
}
private getActivityMeta(entry: LedgerEntry): string {
  return `${this.formatDate(entry.createdAt)} • ${this.getActivityType(entry)}`;
}
private formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
private getActivityTitle(entry: LedgerEntry): string {
  switch (entry.entryType) {
    // حط الـ enum values بتاعتك هنا
    default:
      return 'Wallet transaction';
  }
}
private getActivityType(entry: LedgerEntry): string {
  switch (entry.entryType) {
    default:
      return 'Wallet transaction';
  }
}

private getActivityStatus(entry: LedgerEntry): string {
  switch (entry.entryType) {
    default:
      return 'Completed';
  }
}

private getActivityStatusTone(
  entry: LedgerEntry,
): 'done' | 'warn' | 'pending' {
  switch (entry.entryType) {
    default:
      return 'done';
  }
}

private getActivityIcon(
  entry: LedgerEntry,
): 'wallet' | 'transfer' | 'up' {
  switch (entry.entryType) {
    default:
      return 'wallet';
  }
}

private isCredit(entry: LedgerEntry): boolean {
  switch (entry.entryType) {
    // TopUp / Refund / ...
    // return true;

    // Escrow / Withdrawal / ...
    // return false;

    default:
      return entry.amount > 0;
  }
}
  protected get canTopUp(): boolean {
    return Number(this.topUpAmount) > 0;
  }

  protected get canPay(): boolean {
    return (
      this.paymentFormOpen() &&
      Number(this.topUpAmount) > 0 &&
      this.paymentFormComplete() &&
      !!this.stripe &&
      !!this.elements &&
      !this.paying()
    );
  }

 

  loadWallet(): void {
    this.paymentService.getWallet().subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
      },
      error: (err) => console.error(err),
    });
  }

  topUp(): void {
    if (!this.canTopUp) return;

    this.paymentService.createTopUp(this.topUpAmount).subscribe({
      next: async (res) => {
        this.collapsePaymentForm();

        this.elements = this.stripe!.elements({
          clientSecret: res.clientSecret,
        });

        this.paymentElement = this.elements.create('payment');
        this.paymentFormComplete.set(false);
        this.paymentFormOpen.set(true);

        this.paymentElement.on('change', (event) => {
          this.paymentFormComplete.set(event.complete);
        });

        this.paymentElement.mount('#payment-element');
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Could not start top up. Please try again.');
      },
    });
  }

  async pay(): Promise<void> {
    if (!this.canPay || !this.stripe || !this.elements) return;

    this.paying.set(true);

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: 'http://localhost:4200/payment-success',
      },
      redirect: 'if_required',
    });

    this.paying.set(false);

    if (error) {
      console.error(error.message);
      this.toast.error(error.message ?? 'Payment failed. Please try again.');
      return;
    }

    this.toast.success('Payment completed successfully.');
    this.collapsePaymentForm();
    this.topUpAmount = 0;
    this.loadWallet();
  }

  private collapsePaymentForm(): void {
    this.paymentElement?.unmount();
    this.paymentElement = null;
    this.elements = null;
    this.paymentFormComplete.set(false);
    this.paymentFormOpen.set(false);

    const host = document.getElementById('payment-element');
    if (host) host.innerHTML = '';
  }

  protected activityIcon(kind: 'wallet' | 'transfer' | 'up'): IconSvgObject {
    if (kind === 'transfer') return this.transferIcon;
    if (kind === 'up') return this.upIcon;
    return this.walletIcon;
  }
}
