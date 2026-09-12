import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { Permission, hasPermission } from '../config/permissions';
import { AppError } from '../utils/app-error';
import { prisma } from '../config/database';

/**
 * Require specific role(s).
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return next(AppError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }

    next();
  };
}

/**
 * Require specific permission(s).
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    const userRole = req.user.role as UserRole;
    const hasAll = permissions.every((p) => hasPermission(userRole, p));

    if (!hasAll) {
      return next(AppError.forbidden(`Insufficient permissions: ${permissions.join(', ')}`));
    }

    next();
  };
}

/**
 * Authorize access: checks user is authenticated.
 */
export function authorize() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }
    next();
  };
}

/**
 * Require BOP-level access: ensures user is assigned to the requested BOP
 * or has SUPER_ADMIN/COMMANDER role.
 */
export function requireBopAccess(getBopId: (req: Request) => string | null | undefined | Promise<string | null | undefined>) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(AppError.unauthorized('Authentication required'));
      }

      const role = req.user.role as UserRole;

      // SUPER_ADMIN and COMMANDER can access all BOPs
      if (role === 'SUPER_ADMIN' || role === 'COMMANDER') {
        return next();
      }

      const requestedBopId = await getBopId(req);
      if (!requestedBopId) {
        return next(); // No BOP context needed
      }

      if (!req.user.assignedBopId || req.user.assignedBopId === requestedBopId) {
        return next();
      }

      const requestedBop = await prisma.bop.findFirst({
        where: { OR: [{ id: requestedBopId }, { code: requestedBopId }] },
        select: { id: true },
      });

      if (requestedBop?.id !== req.user.assignedBopId) {
        return next(AppError.forbidden('You are not authorized to access this BOP'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
