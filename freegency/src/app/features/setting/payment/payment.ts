import { Component, inject, NgModule, signal } from '@angular/core';
import { PaymentService } from '../Data-Access/payment-service';
import { Wallet } from '../../../shared/models/Wallet';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment.development';
@Component({
  selector: 'app-payment',
  imports: [CurrencyPipe,FormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment {
   private paymentService = inject(PaymentService);
  wallet = signal<Wallet | null>(null);
  topUpAmount = 100;
  stripe: Stripe | null = null;

elements: StripeElements | null = null;
  async ngOnInit() {
    this.stripe = await loadStripe(
        environment.stripePublicKey
      );
    this.loadWallet();

  }

  loadWallet() {

    this.paymentService.getWallet().subscribe({

      next: wallet => {
        this.wallet.set(wallet);

      },

      error: err => console.error(err)

    });

  }
  topUp() {

  if (this.topUpAmount <= 0)
    return;

  this.paymentService
      .createTopUp(this.topUpAmount)
      .subscribe({

        next: async res => {

  this.elements =
      this.stripe!.elements({

        clientSecret: res.clientSecret

      });

  const paymentElement =
      this.elements.create('payment');

  paymentElement.mount('#payment-element');

},

        error: err => {

          console.error(err);

        }

      });

}
async pay() {

  if (!this.stripe || !this.elements)
    return;

  const { error } = await this.stripe.confirmPayment({

    elements: this.elements,

    confirmParams: {
      return_url: 'http://localhost:4200/payment-success'
    },

    redirect: 'if_required'

  });

  if (error) {

    console.error(error.message);

    return;

  }

  alert('Payment Completed');

}
}
