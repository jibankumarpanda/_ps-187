import { Request, Response, NextFunction } from 'express';
import { EvidenceService } from '../services/evidence.service';
import { AuditService } from '../services/audit.service';
import { firstQueryValue } from '../utils/request';

export class EvidenceController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EvidenceService.getAll({
        bopId: firstQueryValue(req.query.bopId),
        status: firstQueryValue(req.query.status),
        page: firstQueryValue(req.query.page) ? parseInt(firstQueryValue(req.query.page)!, 10) : undefined,
        limit: firstQueryValue(req.query.limit) ? parseInt(firstQueryValue(req.query.limit)!, 10) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const evidence = await EvidenceService.getById(String(req.params.id));
      await AuditService.log({
        userId: req.user!.id, action: 'EVIDENCE_VIEWED', resource: 'Evidence',
        resourceId: String(req.params.id), ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      res.json({ success: true, data: evidence });
    } catch (error) { next(error); }
  }

  static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const submittedHash = req.body?.submittedHash || req.body?.hash;
      const result = await EvidenceService.verify(String(req.params.id), submittedHash);
      await AuditService.log({
        userId: req.user!.id, action: 'EVIDENCE_VERIFIED', resource: 'Evidence',
        resourceId: String(req.params.id), ipAddress: req.ip, userAgent: req.headers['user-agent'],
      });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async audit(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await EvidenceService.getAuditTrail(String(req.params.id)) }); }
    catch (error) { next(error); }
  }
}
