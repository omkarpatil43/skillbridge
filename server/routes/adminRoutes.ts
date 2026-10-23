import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { Router, Response } from 'express';
import { UserModel } from '../models/User.js';
import { ClubModel } from '../models/Club.js';
import { AdminInviteModel } from '../models/AdminInvite.js';
import { AdminAuditLogModel } from '../models/AdminAuditLog.js';
import { authorizeRoles, AuthenticatedRequest, requireStepUpAuth, verifyToken } from '../middleware/adminAuth.js';
import { isValidPictEmail } from '../services/academicYear.js';
import { deliverClubAdminInvite } from '../services/inviteMailer.js';

export const adminRouter = Router();
const DEMO_USER_EMAILS = ['student@pict.edu', 'senior@pict.edu', 'clublead@pict.edu'];
const collegeAdminOnly = [verifyToken, authorizeRoles('college_admin')];
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const adminPasswordIsStrong = (password: string) => password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
const audit = (actorId: string, actionType: 'PROMOTE_USER' | 'REVOKE_ADMIN' | 'INVITE_SENT' | 'INVITE_ACCEPTED', targetUserId?: string, details: Record<string, unknown> = {}) => AdminAuditLogModel.create({ actorId, actionType, targetUserId, details });

adminRouter.patch('/promote-user', ...collegeAdminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const { userId, newRole, managedClubId } = req.body;
  if (!userId || !['club_admin', 'college_admin'].includes(newRole)) return res.status(400).json({ error: 'userId and a valid newRole are required' });
  if (newRole === 'college_admin') {
    const password = req.body.currentPassword;
    if (!password || !req.user?.passwordHash || !(await bcrypt.compare(password, req.user.passwordHash))) return res.status(403).json({ error: 'Current password confirmation is required for this action' });
  }
  if (newRole === 'club_admin') {
    if (!managedClubId) return res.status(400).json({ error: 'managedClubId is required for a club admin' });
    if (!await ClubModel.exists({ id: managedClubId })) return res.status(404).json({ error: 'Club not found' });
  }
  const target = await UserModel.findOne({ id: userId });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.verificationStatus !== 'Verified') return res.status(409).json({ error: 'Only verified users can be promoted' });
  target.role = newRole;
  target.managedClubId = newRole === 'club_admin' ? managedClubId : undefined;
  target.isApproved = true;
  target.adminStatus = 'Active';
  target.createdBy = req.user!.id;
  await target.save();
  await audit(req.user!.id, 'PROMOTE_USER', target.id, { newRole, managedClubId: target.managedClubId });
  return res.json({ success: true, user: target.toJSON() });
});

adminRouter.patch('/revoke-admin/:userId', ...collegeAdminOnly, requireStepUpAuth, async (req: AuthenticatedRequest, res: Response) => {
  const target = await UserModel.findOne({ id: req.params.userId });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (!['club_admin', 'college_admin'].includes(target.role)) return res.status(400).json({ error: 'Target is not an admin account' });
  if (target.role === 'college_admin') {
    const activeCount = await UserModel.countDocuments({ role: 'college_admin', adminStatus: 'Active' });
    if (activeCount <= 1) return res.status(409).json({ error: 'Cannot revoke the last active college administrator' });
  }
  target.role = 'student'; target.managedClubId = undefined; target.isApproved = true; target.adminStatus = 'Revoked';
  await target.save();
  await audit(req.user!.id, 'REVOKE_ADMIN', target.id, {});
  return res.json({ success: true, user: target.toJSON() });
});

adminRouter.post('/invite-club-admin', ...collegeAdminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const clubId = String(req.body.clubId || '');
  if (!isValidPictEmail(email)) return res.status(400).json({ error: 'A valid PICT email is required' });
  if (!await ClubModel.exists({ id: clubId })) return res.status(404).json({ error: 'Club not found' });
  const rawToken = crypto.randomBytes(32).toString('base64url');
  await AdminInviteModel.deleteMany({ email, clubId, usedAt: null });
  await AdminInviteModel.create({ email, clubId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), createdBy: req.user!.id });
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const delivery = await deliverClubAdminInvite(email, `${appUrl}/admin/accept-invite?token=${rawToken}`);
  await audit(req.user!.id, 'INVITE_SENT', undefined, { email, clubId });
  return res.status(201).json({ success: true, message: delivery.delivered ? 'Invite sent' : 'Invite created (local delivery mode)', inviteUrl: delivery.inviteUrl });
});

adminRouter.post('/accept-invite', async (req: AuthenticatedRequest, res: Response) => {
  const { token, password, name } = req.body;
  if (!token || !password || !name) return res.status(400).json({ error: 'token, name, and password are required' });
  if (!adminPasswordIsStrong(password)) return res.status(400).json({ error: 'Admin password must be 10+ characters with upper/lower case, a number, and a symbol' });
  const invite = await AdminInviteModel.findOneAndUpdate({ tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { new: true });
  if (!invite) return res.status(400).json({ error: 'This invite is invalid, expired, or has already been used' });
  if (!await ClubModel.exists({ id: invite.clubId })) return res.status(404).json({ error: 'The invited club no longer exists' });
  const passwordHash = await bcrypt.hash(password, 12);
  let user = await UserModel.findOne({ email: invite.email });
  if (user) {
    user.role = 'club_admin'; user.managedClubId = invite.clubId; user.isApproved = true; user.adminStatus = 'Active'; user.createdBy = invite.createdBy;
    // Existing student keeps their password; never silently overwrite it.
  } else {
    user = new UserModel({ id: `admin-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, name: String(name).trim(), email: invite.email, passwordHash, branch: 'Club Administration', year: 'Club Administrator', role: 'club_admin', managedClubId: invite.clubId, isApproved: true, adminStatus: 'Active', createdBy: invite.createdBy, verificationStatus: 'Verified' });
  }
  await user.save();
  await audit(invite.createdBy, 'INVITE_ACCEPTED', user.id, { email: invite.email, clubId: invite.clubId });
  return res.status(201).json({ success: true, user: user.toJSON() });
});

adminRouter.get('/list-admins', ...collegeAdminOnly, async (_req: AuthenticatedRequest, res: Response) => {
  const users = await UserModel.find({
    role: { $in: ['club_admin', 'college_admin'] },
    email: { $nin: DEMO_USER_EMAILS },
  }).sort({ createdAt: -1 });
  return res.json({ success: true, users });
});

adminRouter.get('/pending-verifications', ...collegeAdminOnly, async (_req: AuthenticatedRequest, res: Response) => {
  const users = await UserModel.find({
    verificationStatus: { $in: ['Pending', 'Rejected'] },
    email: { $nin: DEMO_USER_EMAILS },
  }).sort({ createdAt: -1 });
  return res.json({ success: true, users });
});

adminRouter.get('/audit-log', ...collegeAdminOnly, async (req: AuthenticatedRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const [entries, total] = await Promise.all([AdminAuditLogModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), AdminAuditLogModel.countDocuments()]);
  return res.json({ success: true, entries, pagination: { page, limit, total } });
});
