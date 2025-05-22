// Full helper/page.tsx code (corrected and complete)

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseclient';
import { uploadProfileImage } from '@/lib/uploadImage';

type Task = {
  id: string;
  text: string;
  zip: string;
  status: string;
  helper_id: string | null;
  user_id: string;
  proposed_rate: number;
  bid_rate?: number;
  address?: string;
  start_time?: string;
  end_time?: string;
  total_time?: number;
  final_amount?: number;
  has_tools?: boolean;
  task_photo_url?: string;
};

export default function HelperDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bioVisible, setBioVisible] = useState(false);
  const [bio, setBio] = useState<string>('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [bidValues, setBidValues] = useState<{ [taskId: string]: number }>({});
  const [hasToolsMap, setHasToolsMap] = useState<{ [taskId: string]: boolean }>({});

  const handleEditBio = () => {
  setEditedBio(bio);  // preload current bio
  setIsEditingBio(true);
};

const handleSaveBio = async () => {
  if (!userId) return;

  const { error } = await supabase
    .from('profiles')
    .update({ bio: editedBio })
    .eq('id', userId);

  if (!error) {
    setBio(editedBio);
    setIsEditingBio(false);
  } else {
    alert("Failed to update bio.");
  }
};

const handleCancelEdit = () => {
  setEditedBio('');
  setIsEditingBio(false);
};

  useEffect(() => {
  fetchData(); // initial load

  const interval = setInterval(() => {
    fetchData(); // refresh every 5 seconds
  }, 5000);

  return () => clearInterval(interval); // cleanup
}, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('zip, profile_image_url, bio, average_rating, rating_count')
      .eq('id', user.id)
      .single();

    setProfileImage(profile?.profile_image_url || null);
    setBio(profile?.bio || '');
    setAverageRating(profile?.average_rating || null);
    setRatingCount(profile?.rating_count || 0);

    const { data: fetchedTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`and(status.eq.pending,zip.eq.${profile?.zip}),and(status.eq.confirmed,helper_id.eq.${user.id}),and(status.eq.completed,helper_id.eq.${user.id}))`);

    if (error) console.error('Fetch tasks error:', error);
    setTasks(fetchedTasks || []);
    setLoading(false);
  };

  const updateTaskTime = async (taskId: string, field: 'start_time' | 'end_time') => {
    const timestamp = new Date().toISOString();

    if (field === 'start_time') {
      await supabase.from('tasks').update({ start_time: timestamp }).eq('id', taskId);
      fetchData();
      return;
    }

    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (!task?.start_time) return;

    await supabase.from('tasks').update({ end_time: timestamp }).eq('id', taskId);

    const totalSeconds = (new Date(timestamp).getTime() - new Date(task.start_time).getTime()) / 1000;
    const totalMinutes = totalSeconds / 60;
    const roundedMinutes = Math.max(60, Math.ceil(totalMinutes / 5) * 5);
    const hours = roundedMinutes / 60;

    const finalAmount = parseFloat(((task.bid_rate || task.proposed_rate) * hours).toFixed(2));

    await supabase.from('tasks').update({
      total_time: Math.round(totalSeconds),
      final_amount: finalAmount,
      status: 'completed',
    }).eq('id', taskId);

    fetchData();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const publicUrl = await uploadProfileImage(file, userId);
    await supabase.from('profiles').update({ profile_image_url: publicUrl }).eq('id', userId);
    setProfileImage(publicUrl);
  };

  const handleAcceptWithBid = async (task: Task, rate: number, helperHasTools: boolean) => {
    if (!userId) return;

    if (!task.has_tools && !helperHasTools) {
      alert('You must have the required tools, equipment, and materials to perform this task.');
      return;
    }

    await supabase.from('task_bids').upsert({
      task_id: task.id,
      helper_id: userId,
      bid_rate: rate,
    }, { onConflict: 'task_id,helper_id' });

    await supabase.from('tasks').update({
      helper_id: userId,
      bid_rate: rate,
    }).eq('id', task.id);

    fetchData();
  };

  return (
    <main className="min-h-screen bg-green-50 p-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 px-2 mb-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border border-green-500">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs text-center text-gray-500 block mt-5 px-1">No Image</span>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-800">Honeydew</h1>
          <img src="/logo.png" alt="Honeydew Logo" className="mx-auto h-40 w-auto mt-1" />
          {averageRating !== null && (
            <p className="text-green-700 text-sm mt-1">
              ⭐ {averageRating.toFixed(1)} ({ratingCount})
            </p>
          )}
        </div>

        <div>
          <button
            onClick={() => setBioVisible(!bioVisible)}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            {bioVisible ? 'Hide Bio' : 'Show Bio'}
          </button>
        </div>
      </div>

      {bioVisible && (
  <div className="max-w-xl mx-auto mt-4 bg-white border border-green-200 rounded p-4 shadow-sm">
    <h2 className="text-lg font-semibold text-green-800 mb-2">Your Bio</h2>

    {isEditingBio ? (
      <>
        <textarea
          value={editedBio}
          onChange={(e) => setEditedBio(e.target.value)}
          rows={4}
          className="w-full p-2 border rounded"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={handleCancelEdit} className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={handleSaveBio} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
            Save
          </button>
        </div>
      </>
    ) : (
      <>
        <p className="text-gray-700 whitespace-pre-line">
          {bio || "You haven't added a bio yet."}
        </p>
        <div className="mt-4 text-right">
          <button
            onClick={handleEditBio}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Edit Bio
          </button>
        </div>
      </>
    )}
  </div>
)}

      <h1 className="text-3xl font-bold text-green-900 mb-6 text-center">Your Tasks</h1>

      {loading ? (
        <p className="text-center text-gray-500">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-center text-gray-600">No tasks available.</p>
      ) : (
        <ul className="space-y-4 max-w-xl mx-auto">
          {tasks.map((task) => (
            <li key={task.id} className={`border border-green-300 bg-white rounded-lg p-4 shadow-sm ${task.status === 'completed' && task.final_amount ? 'opacity-50 pointer-events-none' : ''}`}>
              <p className="text-lg font-semibold text-green-800">{task.text}</p>
              <p className="text-sm text-gray-600">Rate: ${task.bid_rate ?? task.proposed_rate}/hr</p>

              {task.has_tools ? (
                <p className="text-sm text-green-700">✔ User has tools</p>
              ) : (
                <p className="text-sm text-red-600">❗ No tools provided</p>
              )}

              {task.task_photo_url && (
                <img src={task.task_photo_url} alt="Task reference" className="mt-2 w-full max-h-64 object-cover rounded" />
              )}

              {task.status === 'pending' && task.helper_id === userId && (
                <p className="text-sm italic text-yellow-600">⏳ Pending User Confirmation</p>
              )}

              {task.status === 'pending' && !task.helper_id && (
                <div className="mt-4">
                  <label className="block text-sm mb-1">Your Bid: ${bidValues[task.id] ?? task.proposed_rate}/hr</label>
                  <input type="range" min={12} max={50} step={1} value={bidValues[task.id] ?? task.proposed_rate}
                    onChange={(e) => setBidValues((prev) => ({ ...prev, [task.id]: parseInt(e.target.value) }))} className="w-full mb-2" />
                  <label className="text-sm block">
                    <input type="checkbox" checked={hasToolsMap[task.id] || false}
                      onChange={(e) => setHasToolsMap((prev) => ({ ...prev, [task.id]: e.target.checked }))} className="mr-2" />
                    I have the tools, equipment, or materials required
                  </label>
                  <button onClick={() => handleAcceptWithBid(task, bidValues[task.id] ?? task.proposed_rate, hasToolsMap[task.id] ?? false)}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full">
                    ✅ Accept & Submit Bid
                  </button>
                </div>
              )}

              {task.status === 'confirmed' && task.helper_id === userId && task.address && (
                <p className="text-sm mt-2 text-green-700">
                  📍 Address: <a href={`https://maps.google.com/?q=${task.address}`} target="_blank" className="underline text-blue-700">{task.address}</a>
                </p>
              )}

              {task.status === 'confirmed' && task.helper_id === userId && (
                <div className="mt-3 flex gap-2">
                  {!task.start_time && (
                    <button onClick={() => updateTaskTime(task.id, 'start_time')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                      ✅ Task Started
                    </button>
                  )}
                  {task.start_time && !task.end_time && (
                    <button onClick={() => updateTaskTime(task.id, 'end_time')} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                      🚪 Task Complete
                    </button>
                  )}
                </div>
              )}

              {task.status === 'completed' && task.final_amount && (
                <p className="text-sm mt-2 text-green-700 font-semibold">
                  ✅ Payment Complete – Final Paid: ${task.final_amount.toFixed(2)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
