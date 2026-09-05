const { createClient } = require('@supabase/supabase-js');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Auth error:', error?.message, '| SUPABASE_URL set:', !!process.env.SUPABASE_URL, '| SERVICE_KEY set:', !!process.env.SUPABASE_SERVICE_KEY);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  req.userId = user.id;
  next();
}

module.exports = authMiddleware;
