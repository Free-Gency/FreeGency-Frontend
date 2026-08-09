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
