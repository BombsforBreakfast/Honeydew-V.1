import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-04-30.basil',
});

type PaymentRequestBody = {
  amount: number;
  tip?: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PaymentRequestBody;
  const { amount, tip } = body;

  if (!amount || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Invalid or missing amount' }, { status: 400 });
  }

  const totalAmount = Math.round((amount + (tip || 0)) * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: unknown) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: 'Stripe Payment Intent failed' }, { status: 500 });
  }
}