/**
 * Operational Fog - Authentication & Server-Side Authorization Middleware
 * Validates service credentials, resolves user identity, and enforces role access controls.
 *
 * SECURITY MODEL (prototype):
 * - Identity is carried via X-Service-Id header or Bearer token (set from currentUser.serviceId).
 * - Role is carried via X-User-Role header.
 * - The DB is consulted to verify the claimed identity and role on sensitive endpoints.
 * - Default role is 'participant' (not 'instructor') to deny-by-default.
 * - Unverified users claiming 'instructor' header are NOT granted instructor privileges.
 */

export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const roleHeader = req.headers['x-user-role'];
  const serviceIdHeader = req.headers['x-service-id'];

  let serviceId = null;
  // Default role is 'participant' — never default to 'instructor'
  let role = (roleHeader || 'participant').toLowerCase().trim();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    serviceId = authHeader.split(' ')[1] || null;
  } else if (serviceIdHeader) {
    serviceId = serviceIdHeader;
  }

  // Query-param role override is REMOVED — was a trivial spoofing vector:
  //   GET /api/exercises/:id/messages?role=instructor
  // Role must come from request headers / DB resolution only.

  req.user = {
    serviceId,            // claimed identity (string or null for anonymous)
    role,                 // claimed role (lowercase, defaulting to 'participant')
    dbRole: null,         // resolved from DB by resolveUserFromDB() — authoritative
    verified: false,      // true once DB confirms the serviceId is a known user
    authenticatedAt: new Date().toISOString()
  };

  next();
}

/**
 * Middleware: resolves req.user.serviceId against the users table.
 * Sets req.user.dbRole and req.user.verified.
 * Must be used together with a pool reference — inject via factory.
 */
export function makeResolveUser(pool) {
  return async function resolveUser(req, res, next) {
    if (!req.user?.serviceId) {
      // Anonymous request — no identity to verify
      return next();
    }
    try {
      const result = await pool.query(
        'SELECT role FROM users WHERE service_id = $1',
        [req.user.serviceId]
      );
      if (result.rows.length > 0) {
        req.user.dbRole = result.rows[0].role;
        req.user.verified = true;
      }
      // Unknown serviceId → verified stays false, dbRole stays null
    } catch (_) {
      // DB failure — don't crash, just leave unverified
    }
    next();
  };
}

/**
 * requireRole(allowedRoles)
 *
 * Authoritative role check — uses dbRole (from DB) when available,
 * falls back to header-supplied role for prototype requests where the
 * user is not in the users table (e.g. dynamic join participants).
 *
 * Denies instructor access if the user claims 'instructor' in headers but
 * is not verified as an instructor in the DB.
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    if (!req.user.serviceId) {
      return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
    }

    // Determine effective role: DB role takes precedence over header.
    let effectiveRole = req.user.dbRole || req.user.role || 'participant';

    // Unverified users claiming 'instructor' without a DB instructor record are demoted to 'participant'
    if (effectiveRole === 'instructor' && req.user.dbRole !== 'instructor') {
      effectiveRole = 'participant';
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    const isAllowed = allowedRoles.includes(effectiveRole) || (effectiveRole === 'instructor');

    if (!isAllowed) {
      return res.status(403).json({
        error: `Forbidden: Role "${effectiveRole}" is not authorized for this operation. Required: ${allowedRoles.join(' or ')}.`
      });
    }

    next();
  };
}

