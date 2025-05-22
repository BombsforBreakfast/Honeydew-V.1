'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseclient';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

type Task = {
  id: string;
  text: string;
  zip: string;
  status: string;
  user_id: string;
  helper_id: string | null;
  proposed_rate: number;
  bid_rate?: number;
  address?: string;
  start_time?: string;
  end_time?: string;
  has_tools?: boolean;
  task_photo_url?: string;
};

export default function UserDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskText, setTaskText] = useState('');
  const [proposedRate, setProposedRate] = useState(20);
  const [customAddress, setCustomAddress] = useState('');
  const [hasTools, setHasTools] = useState(false);
  const [taskPhoto, setTaskPhoto] = useState<File | null>(null);
  const [reviewText, setReviewText] = useState<{ [taskId: string]: string }>({});
  const [ratingInput, setRatingInput] = useState<{ [taskId: string]: number }>({});
  const [submittedTasks, setSubmittedTasks] = useState<{ [taskId: string]: boolean }>({});
  const [tipAmount, setTipAmount] = useState<{ [taskId: string]: number }>({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: fetchedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    setTasks(fetchedTasks || []);
  };

  const handleTaskSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('zip, address')
      .eq('id', user.id)
      .single();

    let taskPhotoUrl = null;
    if (taskPhoto) {
      const fileExt = taskPhoto.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('task-photos')
        .upload(fileName, taskPhoto);

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        return;
      }

      const { data } = supabase.storage.from('task-photos').getPublicUrl(fileName);
      taskPhotoUrl = data?.publicUrl || null;
    }

    const taskPayload = {
      text: taskText,
      proposed_rate: proposedRate,
      zip: profile?.zip,
      address: customAddress || profile?.address || '',
      user_id: user.id,
      helper_id: null,
      status: 'pending',
      has_tools: hasTools,
      task_photo_url: taskPhotoUrl,
    };

    const { error } = await supabase.from('tasks').insert(taskPayload);
    if (!error) {
      setTaskText('');
      setProposedRate(20);
      setCustomAddress('');
      setHasTools(false);
      setTaskPhoto(null);
      fetchData();
    }
  };

  const handleConfirmHelper = async (taskId: string) => {
    await supabase.from('tasks').update({ status: 'confirmed' }).eq('id', taskId);
    fetchData();
  };

  const handleReviewSubmit = async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: task } = await supabase
      .from('tasks')
      .select('helper_id')
      .eq('id', taskId)
      .single();

    if (!task?.helper_id) return;

    await supabase.from('task_reviews').insert({
      task_id: taskId,
      helper_id: task.helper_id,
      user_id: user.id,
      rating: ratingInput[taskId],
      review_text: reviewText[taskId] || '',
    });

    const { data: allReviews } = await supabase
      .from('task_reviews')
      .select('rating')
      .eq('helper_id', task.helper_id);

    if (!allReviews) {
      console.error('❌ Failed to fetch reviews');
      return;
    }

    const ratings = allReviews.map(r => r.rating);
    const average = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;

    await supabase
      .from('profiles')
      .update({
        average_rating: parseFloat(average.toFixed(2)),
        rating_count: ratings.length,
      })
      .eq('id', task.helper_id);

    setSubmittedTasks(prev => ({ ...prev, [taskId]: true }));
    fetchData();
  };
  const StripeForm = ({ task }: { task: any }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handlePayment = async () => {
      if (!stripe || !elements) return;

      setProcessing(true);
      setErrorMsg('');

      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: task.bid_rate ?? task.proposed_rate,
          tip: tipAmount[task.id] || 0,
        }),
      });

      const { clientSecret } = await response.json();

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        setErrorMsg(result.error.message || 'Payment failed');
        setProcessing(false);
      } else {
        await handleReviewSubmit(task.id);
        setProcessing(false);
      }
    };

    return (
      <div className="mt-4">
        <CardElement className="border p-2 rounded mb-3" />
        <button
          onClick={handlePayment}
          disabled={!stripe || processing}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {processing ? 'Processing…' : '💳 Pay Now & Submit Review'}
        </button>
        {errorMsg && <p className="text-red-500 text-sm mt-2">{errorMsg}</p>}
      </div>
    );
  };

  return (
    <Elements stripe={stripePromise}>
      <main className="min-h-screen bg-green-50 p-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-green-800">Honeydew</h1>
          <div className="my-3">
            <img
              src="/logo.png"
              alt="Honeydew Logo"
              className="mx-auto h-40"
            />
          </div>
        </div>
        {/* Submit a Task */}
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Submit a Task</h2>
          <input
            type="text"
            placeholder="What do you need help with?"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            className="w-full border p-2 mb-2 rounded"
          />
          <label className="block text-sm font-medium text-green-800">Proposed Rate ($/hr)</label>
          <input
            type="number"
            value={proposedRate}
            onChange={(e) => setProposedRate(Number(e.target.value))}
            className="w-full border p-2 mb-2 rounded"
            min={12}
          />
          <label className="block text-sm font-medium text-green-800">Task Address (optional)</label>
          <input
            type="text"
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="Leave blank to use your profile address"
            className="w-full border p-2 mb-2 rounded"
          />
          <label className="block text-sm font-medium text-green-800">Attach a Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setTaskPhoto(e.target.files?.[0] || null)}
            className="w-full border p-2 mb-2 rounded"
          />
          <label className="block text-sm font-medium text-green-800">
            <input
              type="checkbox"
              checked={hasTools}
              onChange={(e) => setHasTools(e.target.checked)}
              className="mr-2"
            />
            I have the tools, equipment, or materials required
          </label>
          <button
            onClick={handleTaskSubmit}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Submit Task
          </button>
        </div>

        {/* Task List */}
        <div className="max-w-xl mx-auto mt-8">
          <h2 className="text-xl font-bold text-green-800 mb-4">Your Tasks</h2>
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="bg-white border border-green-200 rounded p-4 shadow-sm"
              >
                <p className="font-semibold text-green-900">{task.text}</p>
                <p className="text-sm text-gray-600">Status: {task.status}</p>
                <p className="text-sm text-gray-600">Rate: ${task.bid_rate ?? task.proposed_rate}/hr</p>
                {task.has_tools && (
                  <p className="text-sm text-green-700">✔ Tools Provided</p>
                )}
                {task.task_photo_url && (
                  <img
                    src={task.task_photo_url}
                    alt="Task reference"
                    className="mt-2 w-full max-h-64 object-cover rounded"
                  />
                )}

                {task.status === 'pending' && task.helper_id && (
                  <HelperBidView
                    taskId={task.id}
                    helperId={task.helper_id}
                    onConfirm={() => handleConfirmHelper(task.id)}
                  />
                )}
                {task.status === 'confirmed' && task.start_time && !task.end_time && (
                  <p className="text-sm mt-2 text-yellow-700">⏳ Your Task is In Progress</p>
                )}

                {task.status === 'completed' && task.end_time && (
                  <div className="mt-3 border-t pt-3">
                    {submittedTasks[task.id] ? (
                      <div className="w-full bg-green-600 text-white text-center py-2 rounded font-semibold">
                        ✅ Payment & Review Submitted!
                      </div>
                    ) : (
                      <>
                        <p className="text-green-700 font-semibold mb-2">✅ Task Completed — Pay Now</p>

                        <label className="block text-sm font-medium text-green-900 mb-1">Rating:</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() =>
                                setRatingInput((prev) => ({ ...prev, [task.id]: star }))
                              }
                              className={`text-2xl ${
                                ratingInput[task.id] >= star ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>

                        <textarea
                          placeholder="Leave a review (optional)"
                          value={reviewText[task.id] || ''}
                          onChange={(e) =>
                            setReviewText((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          className="w-full mt-2 border p-2 rounded"
                        />

                        <label className="block text-sm font-medium text-green-900 mt-3">Add a Tip (optional)</label>
                        <input
                          type="number"
                          placeholder="$ Tip Amount"
                          value={tipAmount[task.id] || ''}
                          onChange={(e) =>
                            setTipAmount((prev) => ({ ...prev, [task.id]: Number(e.target.value) }))
                          }
                          className="w-full border p-2 rounded"
                        />

                        <StripeForm task={task} />
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </Elements>
  );
}

// HelperBidView component
function HelperBidView({
  taskId,
  helperId,
  onConfirm,
}: {
  taskId: string;
  helperId: string;
  onConfirm: () => void;
}) {
  const [bio, setBio] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [bidRate, setBidRate] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const profile = await supabase
        .from('profiles')
        .select('bio, profile_image_url')
        .eq('id', helperId)
        .single();

      const bid = await supabase
        .from('task_bids')
        .select('bid_rate')
        .eq('task_id', taskId)
        .eq('helper_id', helperId)
        .single();

      setBio(profile.data?.bio || '');
      setImage(profile.data?.profile_image_url || null);
      setBidRate(bid.data?.bid_rate || null);
    };
    load();
  }, [taskId, helperId]);

  return (
    <div className="mt-4 p-3 border border-green-300 rounded bg-green-50">
      <div className="flex items-center gap-3">
        {image ? (
          <img src={image} className="w-12 h-12 rounded-full object-cover" alt="Profile" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300" />
        )}
        <div>
          <p className="text-sm text-gray-800">Bid: <strong>${bidRate}/hr</strong></p>
          <p className="text-sm text-gray-600">{bio}</p>
        </div>
      </div>
      <button
        onClick={onConfirm}
        className="mt-3 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        ✅ Confirm This Helper
      </button>
    </div>
  );
}

