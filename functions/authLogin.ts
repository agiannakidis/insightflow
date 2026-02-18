import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simple bcrypt-compatible hash using Web Crypto (PBKDF2 as alternative)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('pbkdf2:')) return false;
  const [, saltHex, storedHash] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHash;
}

async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action } = body;
    const base44 = createClientFromRequest(req);

    if (action === "login") {
      const { username, password } = body;
      if (!username || !password) {
        return Response.json({ error: "Username and password required" }, { status: 400 });
      }

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const userAgent = req.headers.get("user-agent") || "";

      // Find user by username or email
      const users = await base44.asServiceRole.entities.User.filter({ username });
      let user = users[0];
      if (!user) {
        // Try by email
        const byEmail = await base44.asServiceRole.entities.User.filter({ email: username });
        user = byEmail[0];
      }
      
      if (!user || !user.is_active) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Check lock
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return Response.json({ error: "Account temporarily locked. Try again later." }, { status: 429 });
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const updateData = { failed_login_attempts: attempts };
        if (attempts >= 5) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          updateData.locked_until = lockUntil;
        }
        await base44.asServiceRole.entities.User.update(user.id, updateData);
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Reset failed attempts
      await base44.asServiceRole.entities.User.update(user.id, {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString()
      });

      // Create session
      const token = generateToken();
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.Session.create({
        user_id: user.id,
        session_token_hash: tokenHash,
        expires_at: expiresAt,
        ip,
        user_agent: userAgent,
        is_revoked: false
      });

      return Response.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      });
    }

    if (action === "logout") {
      const { token } = body;
      if (token) {
        const tokenHash = await hashToken(token);
        const sessions = await base44.asServiceRole.entities.Session.filter({ session_token_hash: tokenHash });
        if (sessions[0]) {
          await base44.asServiceRole.entities.Session.update(sessions[0].id, {
            is_revoked: true,
            revoked_at: new Date().toISOString()
          });
        }
      }
      return Response.json({ success: true });
    }

    if (action === "validate") {
      const { token } = body;
      if (!token) return Response.json({ valid: false });
      const tokenHash = await hashToken(token);
      const sessions = await base44.asServiceRole.entities.Session.filter({ session_token_hash: tokenHash });
      const session = sessions[0];
      if (!session || session.is_revoked || new Date(session.expires_at) < new Date()) {
        return Response.json({ valid: false });
      }
      const users = await base44.asServiceRole.entities.User.filter({ id: session.user_id });
      const user = users[0];
      if (!user || !user.is_active) return Response.json({ valid: false });
      return Response.json({ valid: true, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    }

    if (action === "hashPassword") {
      const { password } = body;
      const hash = await hashPassword(password);
      return Response.json({ hash });
    }

    if (action === "setup") {
      // Create first admin user - only allowed if no users exist yet
      const existing = await base44.asServiceRole.entities.User.list();
      if (existing.length > 0) {
        return Response.json({ error: "Setup already complete. Users already exist." }, { status: 403 });
      }
      const { username, password } = body;
      if (!username || !password) {
        return Response.json({ error: "Username and password required" }, { status: 400 });
      }
      const hash = await hashPassword(password);
      const user = await base44.asServiceRole.entities.User.create({
        username,
        password_hash: hash,
        role: 'admin',
        is_active: true,
        failed_login_attempts: 0,
      });
      return Response.json({ success: true, message: "Admin user created successfully" });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("Auth error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});