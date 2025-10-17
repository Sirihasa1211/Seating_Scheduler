const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const ALLOWED_EMAILS = ['22eg105p55@anurag.edu.in'];

const supabaseServer = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

async function requireAuth(req, res, next) {
  try {
    if (!supabaseServer) {
      console.error('Supabase not configured - authentication required');
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    if (!ALLOWED_EMAILS.includes(user.email || '')) {
      return res.status(403).json({ error: 'Unauthorized email' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { supabaseServer, requireAuth };
