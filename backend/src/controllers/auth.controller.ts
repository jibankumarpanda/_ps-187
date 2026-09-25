import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: result.user, verificationCode: result.verificationCode });
    } catch (error) { next(error); }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] as string;
      const result = await AuthService.login(email, password, ip);

      await AuditService.log({
        userId: result.user.id,
        action: 'LOGIN',
        resource: 'User',
        resourceId: result.user.id,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body;
      const result = await AuthService.verifyEmail(email, code);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.resendVerification(req.body.email);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.logout(req.user!.id);

      await AuditService.log({
        userId: req.user!.id,
        action: 'LOGOUT',
        resource: 'User',
        resourceId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }

  static async faceVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const { descriptor, forceEnroll } = req.body;
      const result = await AuthService.verifyFace(req.user!.id, descriptor, !!forceEnroll);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}
