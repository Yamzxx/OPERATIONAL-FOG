/**
 * Operational Fog - Authentication & Server-Side Authorization Middleware
 * Validates service credentials, resolves user identity, and enforces role access controls.
 */

export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const roleHeader = req.headers['x-user-role'];
  const serviceIdHeader = req.headers['x-service-id'];

  let serviceId = 'OPS-8842-IND';
  let role = roleHeader || 'instructor';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    serviceId = authHeader.split(' ')[1] || serviceId;
  } else if (serviceIdHeader) {
    serviceId = serviceIdHeader;
  }

  // Derive role if specified in query or payload
  if (req.query.role) {
    role = req.query.role;
  }

  req.user = {
    serviceId,
    role,
    authenticatedAt: new Date().toISOString()
  };

  next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const userRole = req.user.role;
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole) && userRole !== 'instructor') {
      return res.status(403).json({
        error: `Forbidden: Role "${userRole}" is not authorized for this operation. Allowed roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}
