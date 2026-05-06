import { Injectable, Logger } from '@nestjs/common';
import { CreateCheckoutSessionDto, CreatePaymentIntentDto } from './payments.dto';

type PaymentIntentResponse = {
  id: string;
  clientSecret: string;
  status: string;
  amountCents: number;
  currency: string;
  provider: 'stripe';
  livemode: boolean;
};

type CheckoutSessionResponse = {
  id: string;
  url: string | null;
  status: string;
  amountCents: number;
  currency: string;
  provider: 'stripe';
  livemode: boolean;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  private readonly stripeApiBase = process.env.STRIPE_API_BASE || 'https://api.stripe.com/v1';
  private readonly useMockPayments =
    process.env.USE_MOCK_PAYMENTS === 'true' || this.stripeSecretKey.length === 0;
  private readonly autoConfirm = process.env.STRIPE_AUTOCONFIRM !== 'false';

  private stripeHeaders() {
    return {
      Authorization: `Bearer ${this.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private parseCurrency(input?: string) {
    const normalized = (input || 'eur').trim().toLowerCase();
    return normalized || 'eur';
  }

  async createIntent(body: CreatePaymentIntentDto): Promise<PaymentIntentResponse> {
    if (this.useMockPayments) {
      const mockId = `pi_mock_${Date.now()}`;
      return {
        id: mockId,
        clientSecret: `${mockId}_secret_mock`,
        status: 'succeeded',
        amountCents: body.amountCents,
        currency: this.parseCurrency(body.currency),
        provider: 'stripe',
        livemode: false,
      };
    }

    const form = new URLSearchParams();
    form.set('amount', String(body.amountCents));
    form.set('currency', this.parseCurrency(body.currency));
    form.set('description', body.description || 'Misneach payment');
    form.set('metadata[clientId]', body.clientId);

    if (body.metadata) {
      for (const [key, value] of Object.entries(body.metadata)) {
        if (value == null) continue;
        form.set(`metadata[${key}]`, String(value));
      }
    }

    if (this.autoConfirm) {
      form.set('confirm', 'true');
      form.set('payment_method', 'pm_card_visa');
      form.set('payment_method_types[]', 'card');
    } else {
      form.set('automatic_payment_methods[enabled]', 'true');
    }

    const response = await fetch(`${this.stripeApiBase}/payment_intents`, {
      method: 'POST',
      headers: this.stripeHeaders(),
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Stripe create intent failed (${response.status}): ${errorText}`);
      throw new Error(`Stripe create intent failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      id: string;
      client_secret: string;
      status: string;
      amount: number;
      currency: string;
      livemode: boolean;
    };

    return {
      id: payload.id,
      clientSecret: payload.client_secret,
      status: payload.status,
      amountCents: payload.amount,
      currency: payload.currency,
      provider: 'stripe',
      livemode: payload.livemode,
    };
  }

  async confirmIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    if (this.useMockPayments) {
      return {
        id: paymentIntentId,
        clientSecret: `${paymentIntentId}_secret_mock`,
        status: 'succeeded',
        amountCents: 4900,
        currency: 'eur',
        provider: 'stripe',
        livemode: false,
      };
    }

    const response = await fetch(`${this.stripeApiBase}/payment_intents/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.stripeSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Stripe confirm intent failed (${response.status}): ${errorText}`);
      throw new Error(`Stripe confirm intent failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      id: string;
      client_secret: string;
      status: string;
      amount: number;
      currency: string;
      livemode: boolean;
    };

    return {
      id: payload.id,
      clientSecret: payload.client_secret,
      status: payload.status,
      amountCents: payload.amount,
      currency: payload.currency,
      provider: 'stripe',
      livemode: payload.livemode,
    };
  }

  async createCheckoutSession(body: CreateCheckoutSessionDto): Promise<CheckoutSessionResponse> {
    if (this.useMockPayments) {
      return {
        id: `cs_mock_${Date.now()}`,
        url: null,
        status: 'succeeded',
        amountCents: body.amountCents,
        currency: this.parseCurrency(body.currency),
        provider: 'stripe',
        livemode: false,
      };
    }

    const form = new URLSearchParams();
    const currency = this.parseCurrency(body.currency);

    form.set('mode', 'payment');
    form.set('success_url', body.successUrl);
    form.set('cancel_url', body.cancelUrl);
    form.set('client_reference_id', body.clientId);
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', currency);
    form.set('line_items[0][price_data][unit_amount]', String(body.amountCents));
    form.set(
      'line_items[0][price_data][product_data][name]',
      body.description || 'Misneach signup',
    );

    if (body.metadata) {
      for (const [key, value] of Object.entries(body.metadata)) {
        if (value == null) continue;
        form.set(`metadata[${key}]`, String(value));
      }
    }

    const response = await fetch(`${this.stripeApiBase}/checkout/sessions`, {
      method: 'POST',
      headers: this.stripeHeaders(),
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Stripe checkout session failed (${response.status}): ${errorText}`);
      throw new Error(`Stripe checkout session failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      id: string;
      url: string | null;
      payment_status: string;
      amount_total: number | null;
      currency: string;
      livemode: boolean;
    };

    return {
      id: payload.id,
      url: payload.url,
      status: payload.payment_status || 'unpaid',
      amountCents: payload.amount_total ?? body.amountCents,
      currency: payload.currency || currency,
      provider: 'stripe',
      livemode: payload.livemode,
    };
  }
}
