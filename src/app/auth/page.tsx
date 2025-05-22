'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseclient';

export default function AuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [zip, setZip] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      const user = data?.user ?? data?.session?.user;

      if (error || !user) {
        setErrorMsg(error?.message || 'Signup failed');
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: user.id,
          full_name: fullName,
          zip,
          role,
        },
      ]);

      if (profileError) {
        setErrorMsg(profileError.message);
        setLoading(false);
        return;
      }

      router.push(role === 'helper' ? '/helper' : '/');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setErrorMsg("Account not found. Switching to sign up.");
        setIsSignUp(true);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        setErrorMsg("No profile found. Switching to sign up.");
        setIsSignUp(true);
        setLoading(false);
        return;
      }

      router.push(profile.role === 'helper' ? '/helper' : '/');
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-4">
      <h1 className="text-3xl font-bold mb-6">
        {isSignUp ? 'Create an Account' : 'Sign In'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
        {isSignUp && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border p-2"
              required
            />
            <input
              type="text"
              placeholder="Zip Code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full rounded-md border p-2"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border p-2"
            >
              <option value="user">User</option>
              <option value="helper">Helper</option>
            </select>
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border p-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border p-2"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
        >
          {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
        <p className="text-center text-sm mt-2">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            className="text-green-600 underline"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </form>
    </main>
  );
}
