'use client';

import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Appearance } from '@stripe/stripe-js';
import StripeForm from './StripeForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function StripeCheckout({
  finalAmount,
  onComplete,
}: {
  finalAmount: number;
  onComplete: () => void;
}) {
  const [clientSecret, setClientSecret] = useState('');
  const [tipType, setTipType] = useState<'percent' | 'fixed'>('percent');
  const [tipValue, setTipValue] = useState<number>(0);
  const [tip, setTip] = useState<number>(0);

  useEffect(() => {
    const calculatedTip =
      tipType === 'percent'
        ? parseFloat(((finalAmount * tipValue) / 100).toFixed(2))
        : parseFloat(tipValue.toFixed(2));
    setTip(calculatedTip);
  }, [tipType, tipValue, finalAmount]);

  useEffect(() => {
    if (tip < 0 || isNaN(tip)) return;

    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: finalAmount,
        tip,
      }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [tip, finalAmount]);

  const appearance: Appearance = {
    theme: 'stripe',
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="mt-6 p-4 border border-green-300 bg-white rounded shadow max-w-md mx-auto">
      <h2 className="text-lg font-bold text-green-800 mb-4">Payment Details</h2>

      <div className="mb-4">
        <label className="block text-sm text-green-900 font-medium mb-1">Tip Your Helper</label>
        <div className="flex gap-2 mb-2">
          <button
            className={`px-3 py-1 border rounded ${
              tipType === 'percent'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setTipType('percent')}
          >
            %
          </button>
          <button
            className={`px-3 py-1 border rounded ${
              tipType === 'fixed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            onClick={() => setTipType('fixed')}
          >
            $
          </button>
        </div>
        <input
          type="number"
          min={0}
          value={tipValue}
          onChange={(e) => setTipValue(Number(e.target.value))}
          placeholder={tipType === 'percent' ? 'e.g., 10%' : 'e.g., $5'}
          className="w-full border p-2 rounded"
        />
      </div>

      <div className="mb-4 text-sm text-gray-800">
        <p>
          <strong>Base Amount:</strong> ${finalAmount.toFixed(2)}
        </p>
        <p>
          <strong>Tip:</strong> ${tip.toFixed(2)}
        </p>
        <p className="font-bold mt-1">
          Total: ${(finalAmount + tip).toFixed(2)}
        </p>
      </div>

      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <StripeForm
            clientSecret={clientSecret}
            finalAmount={finalAmount + tip}
            onComplete={onComplete}
          />
        </Elements>
      )}
    </div>
  );
}
