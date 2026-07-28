import { CurrencyPipe } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowUp01Icon,
  CreditCardIcon,
  Money01Icon,
  SecurityCheckIcon,
  Tick02Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment.development';
import { Wallet } from '../../../shared/models/Wallet';
import { PaymentService } from '../Data-Access/payment-service';
import { SignalrService } from '../../../core/Signalr/signalr-service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, HugeiconsIconComponent],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment implements OnInit {
  private paymentService = inject(PaymentService);

  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly moneyIcon = Money01Icon as IconSvgObject;
  protected readonly cardIcon = CreditCardIcon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly upIcon = ArrowUp01Icon as IconSvgObject;
  protected readonly transferIcon = ArrowDataTransferHorizontalIcon as IconSvgObject;
  protected readonly shieldIcon = SecurityCheckIcon as IconSvgObject;
  protected readonly checkIcon = Tick02Icon as IconSvgObject;
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

  /** Static UI placeholders — replace when payment-methods API is ready. */
  protected readonly mockMethods = [
    { brand: 'Visa', last4: '4421', expiry: '12/26', selected: true },
    { brand: 'Mastercard', last4: '8890', expiry: '08/27', selected: false },
  ];

  /** Static UI placeholders — replace when transactions API is ready. */
  protected readonly mockActivity = [
    {
      title: "Payment for 'UI/UX Design System'",
      meta: '26 Jul 2026 • Top Up',
      amount: '+EGP 1,000',
      tone: 'credit' as const,
      status: 'Completed',
      statusTone: 'done' as const,
      icon: 'wallet' as const,
    },
    {
      title: 'Escrow reserve',
      meta: '25 Jul 2026 • Project escrow',
      amount: '-EGP 500',
      tone: 'debit' as const,
      status: 'Reserved',
      statusTone: 'warn' as const,
      icon: 'transfer' as const,
    },
    {
      title: 'Withdrawal request',
      meta: '24 Jul 2026 • Bank transfer',
      amount: '-EGP 250',
      tone: 'debit' as const,
      status: 'Pending',
      statusTone: 'pending' as const,
      icon: 'up' as const,
    },
  ];

  async ngOnInit(): Promise<void> {
    this.stripe = await loadStripe(environment.stripePublicKey);
    this.loadWallet();
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
    if (this.topUpAmount <= 0) return;

    this.paymentService.createTopUp(this.topUpAmount).subscribe({
      next: async (res) => {
        this.elements = this.stripe!.elements({
          clientSecret: res.clientSecret,
        });

        const paymentElement = this.elements.create('payment');
        paymentElement.mount('#payment-element');
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  async pay(): Promise<void> {
    if (!this.stripe || !this.elements) return;

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: 'http://localhost:4200/payment-success',
      },
      redirect: 'if_required',
    });

    if (error) {
      console.error(error.message);
      return;
    }

    alert('Payment Completed');
  }

  protected activityIcon(kind: 'wallet' | 'transfer' | 'up'): IconSvgObject {
    if (kind === 'transfer') return this.transferIcon;
    if (kind === 'up') return this.upIcon;
    return this.walletIcon;
  }
}
