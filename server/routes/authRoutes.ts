import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { UserModel } from '../models/User.js';
import { createAuthToken, verifyAuthToken } from '../services/authToken.js';
import { uploadIdCard, getSecureImagePath } from '../services/uploadService.js';
import { analyzeIdCard, extractBatchYearsFromText } from '../services/ocrService.js';
import {
  classifyStudent,
  isValidPictEmail,
  validatePasswordStrength,
  validateBatchRange,
} from '../services/academicYear.js';
import { db } from '../db.js';
import type { UserRole, StudentLevel, VerificationStatus } from '../../src/types/index.js';

export const authRouter = Router();
const DEMO_USER_EMAILS = ['student@pict.edu', 'senior@pict.edu', 'clublead@pict.edu'];
const DEMO_USER_EMAIL_SET = new Set(DEMO_USER_EMAILS);

const isDemoUser = (user: { id?: string; email?: string }) =>
  ['u-1', 'u-2', 'u-3'].includes(user.id || '') ||
  DEMO_USER_EMAIL_SET.has(user.email?.trim().toLowerCase() || '');

// ── Resilient User Repository Helpers (Dual-Mode: MongoDB + Local Persistent Store) ──

export const findUserSafe = async (filter: { id?: string; email?: string; rollNo?: string; $or?: Array<{ email?: string; rollNo?: string }> }): Promise<any> => {
  try {
    const user = await UserModel.findOne(filter);
    if (user) return user;
  } catch {
    // MongoDB Atlas error or offline, fallback to local store
  }

  if (filter.$or) {
    for (const cond of filter.$or) {
      if (cond.email) {
        const clean = cond.email.toLowerCase();
        const found = db.findUser(u => u.email.toLowerCase() === clean);
        if (found) return found;
      }
      if (cond.rollNo) {
        const cleanRoll = cond.rollNo.toUpperCase();
        const found = db.findUser(u => !!u.rollNo && u.rollNo.toUpperCase() === cleanRoll);
        if (found) return found;
      }
    }
  }
  if (filter.id) {
    const found = db.findUser(u => u.id === filter.id);
    if (found) return found;
  }
  if (filter.email) {
    const clean = filter.email.toLowerCase();
    const found = db.findUser(u => u.email.toLowerCase() === clean);
    if (found) return found;
  }
  if (filter.rollNo) {
    const cleanRoll = filter.rollNo.toUpperCase();
    const found = db.findUser(u => !!u.rollNo && u.rollNo.toUpperCase() === cleanRoll);
    if (found) return found;
  }
  return null;
};

export const saveUserSafe = async (userData: any): Promise<any> => {
  const localSaved = db.saveUser(userData);
  try {
    const mongoData = { ...userData };
    // MongoDB sparse unique index expects undefined rather than empty string for non-existent roll numbers
    if (!mongoData.rollNo || mongoData.rollNo.trim() === '') {
      delete mongoData.rollNo;
    }
    const doc = await UserModel.create(mongoData);
    return doc;
  } catch (err: any) {
    console.warn('MongoDB insert skipped/failed, saved to persistent local store:', err.message || err);
    return localSaved;
  }
};


export const updateUserSafe = async (id: string, updates: any): Promise<any> => {
  let updatedDoc: any = null;
  try {
    updatedDoc = await UserModel.findOneAndUpdate({ id }, updates, { new: true });
  } catch {
    // fallback
  }
  const localUpdated = db.updateUser(id, updates);
  return updatedDoc || localUpdated;
};

// ── Rate Limiters ──

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 15,
  message: { error: 'Too many signup attempts from this IP. Please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  message: { error: 'Too many login attempts from this IP. Please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// ── Admin Auth Middleware ──

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const verified = verifyAuthToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const user = await findUserSafe({ id: verified.userId });
    if (!user || isDemoUser(user) || user.role !== 'college_admin' || user.adminStatus !== 'Active') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as Request & { adminUser?: typeof user }).adminUser = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Authorization error' });
  }
};

// ── User Auth Middleware ──

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const verified = verifyAuthToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const user = await findUserSafe({ id: verified.userId });
    if (!user || isDemoUser(user)) {
      return res.status(404).json({ error: 'User not found' });
    }

    (req as Request & { user?: typeof user }).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authorization error' });
  }
};

// ── Verified Senior Mentor or Admin Auth Middleware ──

export const requireVerifiedSeniorOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const token = authHeader.substring(7);
    const verified = verifyAuthToken(token);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const user = await findUserSafe({ id: verified.userId });
    if (!user || isDemoUser(user)) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Admins have unrestricted access
    if (['college_admin', 'admin'].includes(user.role)) {
      (req as Request & { user?: typeof user }).user = user;
      return next();
    }

    // Senior Mentor MUST be verified by Institute Admin
    if (user.role === 'senior') {
      if (user.verificationStatus === 'Verified') {
        (req as Request & { user?: typeof user }).user = user;
        return next();
      }
      return res.status(403).json({
        error: 'Senior Mentor account pending admin approval. Your PICT ID card is currently awaiting verification by the Institute Admin.',
      });
    }

    return res.status(403).json({
      error: 'Permission denied: Only verified seniors approved by the administrator can contribute or edit resources in this section.',
    });
  } catch (error) {
    console.error('Contributor auth middleware error:', error);
    return res.status(500).json({ error: 'Authorization verification error.' });
  }
};

// ── SIGNUP FLOW ──

/**
 * POST /api/auth/signup
 * Multipart form: email, rollNo, password, confirmPassword, name?, branch?, idCard (file)
 */
authRouter.post(
  '/signup',
  (req, res, next) => {
    console.log('[DEBUG AUTH ROUTE] POST /signup endpoint hit! Content-Type:', req.headers['content-type']);
    next();
  },
  signupLimiter,
  (req, res, next) => {
    uploadIdCard.single('idCard')(req, res, (err) => {
      console.log('[DEBUG AUTH ROUTE] Multer callback called, err:', err, 'file:', req.file?.filename);
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload failed' });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    let uploadedFilePath: string | null = null;
    try {
      const { email, rollNo, password, confirmPassword, name, branch } = req.body;

      if (!email || !rollNo || !password) {
        return res.status(400).json({ error: 'College email, roll number, and password are required' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanRoll = String(rollNo).trim().toUpperCase();

      // 1. Validate College Email Domain
      if (!isValidPictEmail(cleanEmail)) {
        return res.status(400).json({
          error: 'Only official PICT email addresses are permitted (@pict.edu or @ms.pict.edu)',
        });
      }

      // 2. Validate Password
      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      const pwdValidation = validatePasswordStrength(password);
      if (!pwdValidation.valid) {
        return res.status(400).json({ error: pwdValidation.reason });
      }

      // 3. Check for existing user with same email or roll number
      const existingUser = await findUserSafe({
        $or: [{ email: cleanEmail }, { rollNo: cleanRoll }],
      });

      if (existingUser) {
        const isEmailDup = existingUser.email === cleanEmail;
        return res.status(409).json({
          error: isEmailDup
            ? 'An account with this PICT email already exists. Please log in.'
            : 'An account with this roll number already exists. Please log in.',
        });
      }

      // 4. Validate ID Card Image
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a photo of your college ID card' });
      }

      uploadedFilePath = req.file.path;
      const fileBuffer = fs.readFileSync(uploadedFilePath);

      // 5. Run OCR & ID Analysis (Gemini Multimodal Vision + Regex Fallback)
      let analysis = {
        batchYears: null as string | null,
        batchStartYear: null as number | null,
        batchEndYear: null as number | null,
        rollNumber: null as string | null,
        studentName: null as string | null,
        confidence: 'low' as 'high' | 'medium' | 'low',
        rawText: '',
      };

      try {
        const result = await analyzeIdCard(fileBuffer);
        analysis = { ...result, rawText: result.rawText ?? '' };
      } catch (ocrErr) {
        console.warn('OCR processing error (will attempt fallback or manual pending):', ocrErr);
      }

      // 6. Batch and Classification Resolution
      let batchStartYear = analysis.batchStartYear;
      let batchEndYear = analysis.batchEndYear;

      // If Gemini didn't find structured batch years, regex match from rawText if available
      if (!batchStartYear && analysis.rawText) {
        const extracted = extractBatchYearsFromText(analysis.rawText);
        if (extracted) {
          batchStartYear = extracted.startYear;
          batchEndYear = extracted.endYear;
          analysis.batchYears = `${extracted.startYear}-${extracted.endYear}`;
        }
      }

      // If still not found, infer from roll number prefix (e.g., "24CS042" -> admission year 2024)
      if (!batchStartYear && cleanRoll) {
        const rollMatch = cleanRoll.match(/(?:C2K)?(2[0-9])/i);
        if (rollMatch) {
          const shortYear = parseInt(rollMatch[1], 10);
          batchStartYear = 2000 + shortYear;
          batchEndYear = batchStartYear + 4;
          analysis.batchYears = `${batchStartYear}-${batchEndYear}`;
        }
      }

      let yearOfStudy = 1;
      let studentLevel: StudentLevel = 'Fresher';
      let displayLabel = '1st Year (Fresher)';
      let verificationStatus: VerificationStatus = 'Pending';
      let ocrConfidenceScore = analysis.confidence === 'high' ? 0.95 : analysis.confidence === 'medium' ? 0.7 : 0.3;

      if (batchStartYear && batchEndYear) {
        const rangeErr = validateBatchRange(batchStartYear, batchEndYear);
        if (!rangeErr) {
          const classification = classifyStudent(batchStartYear);
          if (classification.studentLevel === 'Invalid' || classification.yearOfStudy <= 0) {
            return res.status(400).json({
              error: `The detected batch (${batchStartYear}-${batchEndYear}) is for a future session. You are not a student for this academic year of the college.`,
            });
          }
          yearOfStudy = classification.yearOfStudy;
          studentLevel = classification.studentLevel;
          displayLabel = classification.displayLabel;
        }
      }

      // 7. Hash Password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 8. Derive student name & role
      const derivedName = name
        ? String(name).trim()
        : analysis.studentName || cleanEmail.split('@')[0].replace(/[._]/g, ' ').toUpperCase();

      // Senior Mentor qualification: Year of study >= 2 (2nd Year, 3rd Year, Final Year, or Alumni/senior) or requestedSenior
      const requestedSenior = req.body.requestedRole === 'senior';
      let userRole: UserRole = 'student';
      if (yearOfStudy >= 2 || requestedSenior) {
        userRole = 'senior';
      }

      // Seniors and students start with Pending verification until admin reviews their ID card
      verificationStatus = 'Pending';

      // 9. Save User
      const newUserData = {
        id: `u-${Date.now()}`,
        name: derivedName,
        rollNo: cleanRoll,
        email: cleanEmail,
        passwordHash,
        branch: branch || 'Computer Science & Engg',
        year: displayLabel,
        role: userRole,
        managedClubId: undefined,
        isApproved: true,
        adminStatus: 'Pending' as const,
        avatar: userRole === 'senior'
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        bio: userRole === 'senior'
          ? `${displayLabel} | Senior Student Mentor & Scholar @ PICT`
          : `${displayLabel} | PICT SkillBridge Scholar`,
        badges: userRole === 'senior'
          ? ['Senior Mentor', studentLevel === 'FinalYear' ? 'Final Year Senior' : '3rd Year Senior']
          : [
              studentLevel === 'Fresher'
                ? 'Fresher'
                : studentLevel === 'SecondYear'
                ? 'Sophomore'
                : 'Student Scholar'
            ],
        reputation: userRole === 'senior' ? 100 : 25,
        batchStartYear: batchStartYear || undefined,
        batchEndYear: batchEndYear || undefined,
        yearOfStudy,
        studentLevel,
        verificationStatus,
        ocrConfidenceScore,
        idCardImageRef: req.file ? path.basename(req.file.path) : undefined,
        verifiedAt: undefined,
      };

      const newUser = await saveUserSafe(newUserData);
      const userJson = typeof newUser.toJSON === 'function' ? newUser.toJSON() : newUser;
      const token = createAuthToken(userJson);

      return res.status(201).json({
        success: true,
        message: 'Account created. Please confirm your academic classification.',
        user: userJson,
        token,
        analysis: {
          batchYears: analysis.batchYears,
          batchStartYear,
          batchEndYear,
          rollNumber: analysis.rollNumber,
          studentName: analysis.studentName,
          confidence: analysis.confidence,
          yearOfStudy,
          studentLevel,
          displayLabel,
        },
      });
    } catch (error) {
      console.error('Error in /api/auth/signup:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Registration failed due to an internal server error.' });
    }
  }
);

/**
 * POST /api/auth/signup/confirm
 * Student confirms or flags their detected academic year classification.
 */
authRouter.post('/signup/confirm', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: any }).user;
    const { confirmed, requestedLevel, note } = req.body;

    const updates: any = {};
    if (confirmed === true) {
      updates.verificationStatus = 'Verified';
      updates.verifiedAt = new Date();
    } else {
      updates.verificationStatus = 'Pending';
      if (requestedLevel) {
        updates.bio = `${user.bio || ''} [Requested Level: ${requestedLevel}${note ? ` - ${note}` : ''}]`.trim();
      }
    }

    const updatedUser = await updateUserSafe(user.id, updates);
    const userJson = typeof updatedUser?.toJSON === 'function' ? updatedUser.toJSON() : updatedUser || user;

    return res.json({
      success: true,
      message: confirmed
        ? 'Student ID and academic year verified successfully.'
        : 'Your verification details have been flagged for faculty/admin review. You can still explore the platform.',
      user: userJson,
    });
  } catch (error) {
    console.error('Error in /api/auth/signup/confirm:', error);
    return res.status(500).json({ error: 'Failed to confirm verification status' });
  }
});

/**
 * POST /api/auth/signup-club-admin
 * Club Lead / Admin candidate registration
 */
authRouter.post('/signup-club-admin', signupLimiter, async (req: Request, res: Response) => {
  try {
    const { email, name, password, clubName, phone } = req.body;

    if (!email || !password || !clubName) {
      return res.status(400).json({ error: 'College email, password, and club name are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Validate PICT college email domain
    if (!isValidPictEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'Only official PICT email addresses are permitted (@pict.edu or @ms.pict.edu)',
      });
    }

    // 2. Validate Password
    const pwdValidation = validatePasswordStrength(password);
    if (!pwdValidation.valid) {
      return res.status(400).json({ error: pwdValidation.reason });
    }

    // 3. Check for existing user with this email
    const existing = await findUserSafe({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        error: 'An account with this PICT email already exists. Please log in or contact administration.',
      });
    }

    // 4. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const clubTrimmed = String(clubName).trim();
    const candidateName = name && String(name).trim() ? String(name).trim() : `${clubTrimmed} Representative`;

    // 5. Build Club Admin user profile (Pending review by Institute Admin)
    const newUserData = {
      id: `u-${Date.now()}`,
      name: candidateName,
      email: cleanEmail,
      passwordHash,
      branch: 'Information Technology',
      year: 'Club Lead',
      role: 'club_admin' as UserRole,
      clubName: clubTrimmed,
      phone: phone ? String(phone).trim() : undefined,
      isApproved: false,
      adminStatus: 'Pending' as const,
      verificationStatus: 'Pending' as const,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      bio: `Club Lead / Admin representative for ${clubTrimmed}`,
      badges: ['Club Lead', 'Campus Leader'],
      reputation: 50,
    };

    await saveUserSafe(newUserData);

    // Also update club leader reference in clubs if club exists
    try {
      const allClubs = db.getClubs();
      const matchedClub = allClubs.find(c => c.name.toLowerCase() === clubTrimmed.toLowerCase());
      if (matchedClub) {
        db.updateClub(matchedClub.id, {
          leadEmail: cleanEmail,
          leadName: candidateName,
        });
      }
    } catch {
      // non-blocking
    }

    return res.status(201).json({
      success: true,
      message: 'Club Admin registration request submitted successfully! Your account will be activated once verified by the Institute Admin.',
    });
  } catch (error) {
    console.error('Error in /api/auth/signup-club-admin:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Club admin registration failed due to an internal server error.',
    });
  }
});

// ── LOGIN FLOW (Triple-factor: email + rollNo + password) ──

/**
 * POST /api/auth/login
 * Body: { email, rollNo, password }
 */
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, rollNo, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'PICT email and password are required to sign in.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRoll = rollNo ? String(rollNo).trim().toUpperCase() : '';

    if (DEMO_USER_EMAIL_SET.has(cleanEmail)) {
      return res.status(401).json({
        error: 'Invalid credentials. Please verify your email, roll number, and password.',
      });
    }

    // Admins use the same endpoint, but do not have a student roll number.
    const user = await findUserSafe(
      cleanRoll ? { $or: [{ email: cleanEmail, rollNo: cleanRoll }, { email: cleanEmail }] } : { email: cleanEmail }
    );

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials. Please verify your email, roll number, and password.',
      });
    }

    if (['club_admin', 'college_admin'].includes(user.role)) {
      if (user.adminStatus === 'Pending') return res.status(403).json({ error: 'Your admin account is awaiting approval.' });
      if (user.adminStatus === 'Revoked') return res.status(403).json({ error: 'This admin account has been revoked. Contact the college administrator.' });
      if (!user.isApproved || user.adminStatus !== 'Active') return res.status(403).json({ error: 'Your admin account is not active.' });
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account is temporarily locked due to repeated failed logins. Please try again in ${waitMinutes} minutes.`,
      });
    }

    const isPasswordValid = !!user.passwordHash && await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = (user.loginAttempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : undefined;
      await updateUserSafe(user.id, { loginAttempts: attempts, lockedUntil });

      const remaining = Math.max(0, 5 - attempts);
      const attemptWarning = remaining > 0 ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)` : '';

      return res.status(401).json({
        error: `Invalid credentials. Please verify your email, roll number, and password.${attemptWarning}`,
      });
    }

    // Reset login attempts on successful sign-in
    if (user.loginAttempts > 0 || user.lockedUntil) {
      await updateUserSafe(user.id, { loginAttempts: 0, lockedUntil: undefined });
    }

    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const token = createAuthToken(userJson);

    return res.json({
      success: true,
      message: 'Signed in successfully',
      user: userJson,
      token,
    });
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return res.status(500).json({ error: 'Internal server error during sign in.' });
  }
});

// ── GET CURRENT SESSION USER ──

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: any }).user;
    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;
    return res.json({ success: true, user: userJson });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

// ── ADMIN VERIFICATION ENDPOINTS ──

/**
 * GET /api/auth/admin/pending
 * Returns pending and flagged accounts for faculty/admin review.
 */
authRouter.get('/admin/pending', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    let pendingUsers: any[] = [];
    try {
      const filter: Record<string, unknown> = {};
      if (status && ['Pending', 'Verified', 'Rejected'].includes(status)) {
        filter.verificationStatus = status;
      } else {
        filter.verificationStatus = { $in: ['Pending', 'Rejected'] };
      }
      pendingUsers = await UserModel.find({
        ...filter,
        email: { $nin: DEMO_USER_EMAILS },
      }).sort({ createdAt: -1 });
    } catch {
      // MongoDB query failed, fall back to persistent local store
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      const allLocal = db.getUsers();
      pendingUsers = allLocal.filter(u =>
        u.verificationStatus === 'Pending' ||
        u.verificationStatus === 'Rejected' ||
        u.adminStatus === 'Pending' ||
        (status && (u.verificationStatus === status || u.adminStatus === status))
      );
    }

    return res.json({ success: true, count: pendingUsers.length, users: pendingUsers });
  } catch (error) {
    console.error('Error in /api/auth/admin/pending:', error);
    return res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

/**
 * PUT /api/auth/admin/verify/:userId
 * Approve or reject an account.
 */
authRouter.put('/admin/verify/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { action, studentLevel, year } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be either 'approve' or 'reject'" });
    }

    const user = await findUserSafe({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: any = {};
    if (action === 'approve') {
      updates.verificationStatus = 'Verified';
      updates.verifiedAt = new Date();
      if (user.role === 'club_admin') {
        updates.isApproved = true;
        updates.adminStatus = 'Active';
      }
      if (studentLevel) updates.studentLevel = studentLevel;
      if (year) updates.year = year;
    } else {
      updates.verificationStatus = 'Rejected';
      if (user.role === 'club_admin') {
        updates.isApproved = false;
        updates.adminStatus = 'Revoked';
      }
    }

    const updatedUser = await updateUserSafe(userId, updates);
    const userJson = typeof updatedUser?.toJSON === 'function' ? updatedUser.toJSON() : updatedUser || user;

    return res.json({
      success: true,
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      user: userJson,
    });
  } catch (error) {
    console.error('Error in /api/auth/admin/verify:', error);
    return res.status(500).json({ error: 'Failed to update verification status' });
  }
});

/**
 * GET /api/auth/admin/id-card/:userId
 * Streams the secure ID card image to verified admins for manual review.
 */
authRouter.get('/admin/id-card/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await findUserSafe({ id: userId });

    if (!user || !user.idCardImageRef) {
      return res.status(404).json({ error: 'ID card image not found for this user' });
    }

    const filePath = getSecureImagePath(user.idCardImageRef);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ID card file missing from disk' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Error in /api/auth/admin/id-card:', error);
    return res.status(500).json({ error: 'Failed to retrieve ID card image' });
  }
});

// ── GET ALL USERS (Public directory) ──

authRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    let users: any[] = [];
    try {
      users = await UserModel.find({ email: { $nin: DEMO_USER_EMAILS } }).sort({ reputation: -1 });
    } catch {
      // fallback
    }
    if (!users || users.length === 0) {
      users = db.getUsers();
    }
    return res.json(users.filter(user => !isDemoUser(user)));
  } catch (error) {
    console.error('Error in /api/auth/users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CLUB ADMIN SIGNUP ──
/**
 * POST /api/auth/signup-club-admin
 * No ID card required. Collects email + name + password + club name.
 * Sets adminStatus = 'Pending' until institute admin approves.
 */
authRouter.post('/signup-club-admin', signupLimiter, async (req: Request, res: Response) => {
  try {
    const { email, name, password, clubName } = req.body;

    if (!email || !name || !password || !clubName) {
      return res.status(400).json({ error: 'Email, name, password, and club name are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Must be a PICT email
    if (!isValidPictEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'Only official PICT email addresses are accepted (@pict.edu or @ms.pict.edu).',
      });
    }

    // Password strength
    const pwdValidation = validatePasswordStrength(password);
    if (!pwdValidation.valid) {
      return res.status(400).json({ error: pwdValidation.reason });
    }

    // Check duplicate email
    const existing = await findUserSafe({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newClubAdminData = {
      id: `club-admin-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      rollNo: '',
      passwordHash,
      branch: 'Club Administration',
      year: 'Club Admin',
      role: 'club_admin' as UserRole,
      clubName: clubName.trim(),
      bio: `Club Lead of ${clubName.trim()} at PICT`,
      badges: ['Club Admin'],
      reputation: 0,
      verificationStatus: 'Pending' as VerificationStatus,
      loginAttempts: 0,
      isApproved: false,
      adminStatus: 'Pending' as const, // Must be approved by institute admin before login
    };

    await saveUserSafe(newClubAdminData);

    return res.status(201).json({
      success: true,
      message: `Club admin registration request submitted for "${clubName.trim()}". The institute admin will review and activate your account. You'll receive confirmation once approved.`,
    });
  } catch (error: any) {
    console.error('Club admin signup error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ error: 'Club admin registration failed. Please try again.' });
  }
});
