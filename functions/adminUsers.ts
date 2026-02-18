import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    // Validate session token
    let sessionUser = null;
    if (token) {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hash = await crypto.subtle.digest('SHA-256', data);
      const tokenHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
      const sessions = await base44.asServiceRole.entities.Session.filter({ session_token_hash: tokenHash });
      const session = sessions[0];
      if (session && !session.is_revoked && new Date(session.expires_at) > new Date()) {
        const users = await base44.asServiceRole.entities.AppUser.filter({ id: session.user_id });
        sessionUser = users[0];
      }
    }

    if (!sessionUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (sessionUser.role !== 'admin') return Response.json({ error: "Forbidden" }, { status: 403 });

    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (action === "listUsers") {
      const allUsers = await base44.asServiceRole.entities.AppUser.list();
      return Response.json({ users: allUsers.map(u => ({
        id: u.id, username: u.username, email: u.email,
        role: u.role, is_active: u.is_active,
        created_at: u.created_date, last_login_at: u.last_login_at
      }))});
    }

    if (action === "createUser") {
      const { username, email, password, role } = body;
      if (!username || !password) return Response.json({ error: "Username and password required" }, { status: 400 });
      const hash = await hashPassword(password);
      const newUser = await base44.asServiceRole.entities.User.create({
        username, email, password_hash: hash,
        role: role || 'viewer', is_active: true,
        failed_login_attempts: 0
      });
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: sessionUser.id, actor_email: sessionUser.email || sessionUser.username,
        action: 'create_user', target_user_id: newUser.id,
        details: `Created user: ${username}`, ip
      });
      return Response.json({ success: true, user: { id: newUser.id, username: newUser.username } });
    }

    if (action === "disableUser") {
      const { userId } = body;
      await base44.asServiceRole.entities.User.update(userId, { is_active: false });
      // Revoke all sessions
      const sessions = await base44.asServiceRole.entities.Session.filter({ user_id: userId });
      for (const s of sessions) {
        if (!s.is_revoked) {
          await base44.asServiceRole.entities.Session.update(s.id, { is_revoked: true, revoked_at: new Date().toISOString() });
        }
      }
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: sessionUser.id, actor_email: sessionUser.email || sessionUser.username,
        action: 'disable_user', target_user_id: userId, ip
      });
      return Response.json({ success: true });
    }

    if (action === "enableUser") {
      const { userId } = body;
      await base44.asServiceRole.entities.User.update(userId, { is_active: true });
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: sessionUser.id, actor_email: sessionUser.email || sessionUser.username,
        action: 'enable_user', target_user_id: userId, ip
      });
      return Response.json({ success: true });
    }

    if (action === "resetPassword") {
      const { userId, newPassword } = body;
      const hash = await hashPassword(newPassword);
      await base44.asServiceRole.entities.User.update(userId, { password_hash: hash, failed_login_attempts: 0, locked_until: null });
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: sessionUser.id, actor_email: sessionUser.email || sessionUser.username,
        action: 'reset_password', target_user_id: userId, ip
      });
      return Response.json({ success: true });
    }

    if (action === "changeRole") {
      const { userId, newRole } = body;
      await base44.asServiceRole.entities.User.update(userId, { role: newRole });
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: sessionUser.id, actor_email: sessionUser.email || sessionUser.username,
        action: 'change_role', target_user_id: userId, details: `New role: ${newRole}`, ip
      });
      return Response.json({ success: true });
    }

    if (action === "listAuditLog") {
      const logs = await base44.asServiceRole.entities.AuditLog.list('-created_date', 100);
      return Response.json({ logs });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});