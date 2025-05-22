'use client';

import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState } from 'react';

export default function StripeForm({
  clientSecret,
  onComplete,
  finalAmount,
}: {
  clientSecret: string;
  finalAmount: number;
  onComplete: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [tip, setTip] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
        billing_details: {},
      },
      setup_future_usage: saveCard ? 'on_session' : undefined,
    });

    if (result.error) {
      alert(result.error.message);
      setIsProcessing(false);
    } else if (result.paymentIntent?.status === 'succeeded') {
      alert('✅ Payment successful!');
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 mt-4 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-green-800 mb-2">💳 Pay Now</h2>
      <p className="mb-2 text-sm text-gray-600">Total: ${finalAmount + tip} (incl. fees)</p>

      <label className="block mb-2 font-medium">Add a Tip (optional)</label>
      <input
        type="number"
        className="w-full border p-2 rounded mb-3"
        placeholder="Tip amount ($)"
        value={tip}
        onChange={(e) => setTip(Number(e.target.value))}
        min={0}
      />

      <CardElement className="p-2 border rounded mb-3" />

      <label className="block text-sm mb-3">
        <input
          type="checkbox"
          className="mr-2"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
        />
        Save card for future use
      </label>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}