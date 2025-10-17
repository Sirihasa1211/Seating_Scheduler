import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { SiGoogle } from 'react-icons/si';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        alert('Authentication failed: ' + error.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <GraduationCap className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Student Allocation System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Admin access required
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg font-medium text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <SiGoogle className="w-5 h-5" />
          )}
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Admin Email Authorization</p>
          <p className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-700 dark:text-gray-300">
            22eg105p55@anurag.edu.in
          </p>
        </div>
      </div>
    </div>
  );
}
