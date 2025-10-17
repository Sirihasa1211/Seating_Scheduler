import { useEffect, useState } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const ALLOWED_EMAILS = ['22eg105p55@anurag.edu.in'];

function ProtectedRoute({ children }) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLocation('/login');
      return;
    }

    if (ALLOWED_EMAILS.includes(user.email)) {
      setAuthorized(true);
    } else {
      alert('Unauthorized: Your email is not whitelisted');
      await supabase.auth.signOut();
      setLocation('/login');
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return authorized ? children : null;
}

export default function App() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}
