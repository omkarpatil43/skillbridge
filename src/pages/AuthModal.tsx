import React, { useState, useRef } from 'react';
import { Modal } from '../components/Modal';
import { useAuth, SignupAnalysis } from '../context/AuthContext';
import {
  Lock, Mail, Hash, User as UserIcon, Sparkles,
  CheckCircle2, GraduationCap, Camera, AlertCircle,
  ArrowRight, ArrowLeft, RefreshCw, Eye, EyeOff, Check,
  ShieldCheck, Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccessToast }) => {
  const { login, signup, confirmSignup, clubAdminSignup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginRollNo, setLoginRollNo] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Signup Wizard state
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('Computer Science & Engg');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isApplyingSenior, setIsApplyingSenior] = useState(false);

  // Step 2: ID Card Upload state
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isAnalyzingId, setIsAnalyzingId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Confirmation state
  const [analysisResult, setAnalysisResult] = useState<SignupAnalysis | null>(null);
  const [isFlaggedIncorrect, setIsFlaggedIncorrect] = useState(false);
  const [manualRequestedLevel, setManualRequestedLevel] = useState('Fresher');
  const [manualNote, setManualNote] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Validation & Error message
  const [error, setError] = useState('');

  // ── Club Admin Registration state ──
  const [signupType, setSignupType] = useState<'student' | 'club_admin'>('student');
  const [clubAdminName, setClubAdminName] = useState('');
  const [clubAdminEmail, setClubAdminEmail] = useState('');
  const [clubAdminClubName, setClubAdminClubName] = useState('');
  const [clubAdminPassword, setClubAdminPassword] = useState('');
  const [clubAdminConfirmPassword, setClubAdminConfirmPassword] = useState('');
  const [showClubAdminPassword, setShowClubAdminPassword] = useState(false);
  const [clubAdminPhone, setClubAdminPhone] = useState('');
  const [isSubmittingClubAdmin, setIsSubmittingClubAdmin] = useState(false);
  const [clubAdminSuccess, setClubAdminSuccess] = useState(false);
  const [clubAdminSuccessMsg, setClubAdminSuccessMsg] = useState('');

  const branches = [
    'Computer Science & Engg',
    'Information Technology',
    'Electronics & Telecommunication',
    'Artificial Intelligence & Data Science',
    'Mechanical Engineering',
    'Civil / Other',
  ];

  // Helpers
  const isPictEmail = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    return trimmed.endsWith('@pict.edu') || trimmed.endsWith('@ms.pict.edu');
  };

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const passwordScore = getPasswordStrength(password);

  // ── Handle Login ──
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter your PICT email and password.');
      return;
    }

    if (!isPictEmail(loginEmail)) {
      setLoginError('Only official PICT emails (@pict.edu or @ms.pict.edu) are accepted.');
      return;
    }

    setIsSubmittingLogin(true);
    try {
      const res = await login(loginEmail, loginRollNo, loginPassword);
      if (res.success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        if (onSuccessToast) onSuccessToast(`Welcome back${loginRollNo.trim() ? `, ${loginRollNo.toUpperCase()}` : ''}!`);
        onClose();
      } else {
        setLoginError(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // ── Handle Signup Step 1 → Step 2 ──
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !rollNo.trim() || !password.trim()) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (!isPictEmail(email)) {
      setError('Email must end with @pict.edu or @ms.pict.edu');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSignupStep(2);
  };

  // ── Handle File Selection ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB.');
      return;
    }

    setError('');
    setIdCardFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  // ── Handle Step 2 Upload & OCR Analysis ──
  const handleUploadAndAnalyze = async () => {
    if (!idCardFile) {
      setError('Please select or capture your college ID card photo.');
      return;
    }

    setError('');
    setIsAnalyzingId(true);

    try {
      const formData = new FormData();
      formData.append('email', email.trim().toLowerCase());
      formData.append('rollNo', rollNo.trim().toUpperCase());
      formData.append('name', name.trim());
      formData.append('branch', branch);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      formData.append('requestedRole', isApplyingSenior ? 'senior' : 'student');
      formData.append('idCard', idCardFile);

      const res = await signup(formData);

      if (res.success && res.analysis) {
        setAnalysisResult(res.analysis);
        setSignupStep(3);
      } else {
        setError(res.error || 'Could not verify ID card. Please upload a clear photo.');
      }
    } catch (err: any) {
      setError(err.message || 'ID card processing failed. Please try again.');
    } finally {
      setIsAnalyzingId(false);
    }
  };

  // ── Handle Step 3 Confirmation ──
  const handleFinalizeSignup = async (isConfirmed: boolean) => {
    setIsFinalizing(true);
    setError('');

    try {
      const res = await confirmSignup(
        isConfirmed,
        isConfirmed ? undefined : manualRequestedLevel,
        isConfirmed ? undefined : manualNote
      );

      if (res.success) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
        if (onSuccessToast) {
          onSuccessToast(
            isConfirmed
              ? 'Account verified! Welcome to SkillBridge.'
              : 'Account created! Academic classification sent for faculty review.'
          );
        }
        onClose();
      } else {
        setError(res.error || 'Failed to finalize account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration');
    } finally {
      setIsFinalizing(false);
    }
  };

  // ── Handle Club Admin Signup Submit ──
  const handleClubAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clubAdminEmail.trim() || !clubAdminPassword.trim() || !clubAdminClubName.trim()) {
      setError('Please fill in all mandatory fields (College Email, Club Name, Password).');
      return;
    }

    if (!isPictEmail(clubAdminEmail)) {
      setError('Only official PICT emails (@pict.edu or @ms.pict.edu) are accepted for club administrators.');
      return;
    }

    if (clubAdminPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(clubAdminPassword) || !/[a-z]/.test(clubAdminPassword) || !/\d/.test(clubAdminPassword)) {
      setError('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    if (clubAdminPassword !== clubAdminConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmittingClubAdmin(true);
    try {
      const res = await clubAdminSignup({
        email: clubAdminEmail.trim().toLowerCase(),
        name: clubAdminName.trim() || `${clubAdminClubName.trim()} Representative`,
        password: clubAdminPassword,
        clubName: clubAdminClubName.trim(),
        phone: clubAdminPhone.trim() || undefined,
      });

      if (res.success) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
        setClubAdminSuccess(true);
        setClubAdminSuccessMsg(res.message || 'Club Admin registration request submitted successfully!');
        if (onSuccessToast) onSuccessToast('Club Admin request submitted for administrator verification!');
      } else {
        setError(res.error || 'Club admin registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmittingClubAdmin(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={520} title="">
      <div style={{ padding: '4px 8px 16px' }}>
        {/* Header Tabs */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            color: '#fff',
            marginBottom: 10,
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.25)',
          }}>
            <GraduationCap size={26} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>
            {mode === 'login' ? 'Sign in to SkillBridge' : 'PICT Student Verification'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {mode === 'login'
              ? 'Access campus academic hub, peer mentorship & placements'
              : 'Automated batch extraction & year classification via ID card'}
          </p>

          {/* Toggle Pills */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            padding: 4,
            borderRadius: 12,
            marginTop: 14,
            border: '1px solid var(--border-color)',
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setLoginError(''); }}
              style={{
                padding: '7px 24px',
                borderRadius: 9,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: mode === 'login' ? 'var(--card-bg)' : 'transparent',
                color: mode === 'login' ? 'var(--sky-600)' : 'var(--text-muted)',
                boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setSignupStep(1); setError(''); setLoginError(''); }}
              style={{
                padding: '7px 24px',
                borderRadius: 9,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: mode === 'signup' ? 'var(--card-bg)' : 'transparent',
                color: mode === 'signup' ? 'var(--sky-600)' : 'var(--text-muted)',
                boxShadow: mode === 'signup' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              New Student Signup
            </button>
          </div>
        </div>

        {/* ─── LOGIN VIEW ─── */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loginError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 5 }}>
                PICT College Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  placeholder="e.g. yourname@pict.edu"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 5 }}>
                University Roll Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(students only)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. 24CS042 or C2K23106145"
                  value={loginRollNo}
                  onChange={(e) => setLoginRollNo(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingLogin}
              style={{
                marginTop: 6,
                padding: '11px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: isSubmittingLogin ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              {isSubmittingLogin ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to SkillBridge</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              First time user?{' '}
              <span
                onClick={() => { setMode('signup'); setSignupStep(1); }}
                style={{ color: 'var(--sky-600)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Create an account with College ID
              </span>
            </div>
          </form>
        )}

        {/* ─── SIGNUP WIZARD ─── */}
        {mode === 'signup' && (
          <div>
            {/* Registration Type Switcher: Student vs Club Admin */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              background: 'var(--bg-secondary)',
              padding: 4,
              borderRadius: 12,
              marginBottom: 18,
              border: '1px solid var(--border-color)',
            }}>
              <button
                type="button"
                onClick={() => { setSignupType('student'); setError(''); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 9,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: signupType === 'student' ? 'var(--card-bg)' : 'transparent',
                  color: signupType === 'student' ? 'var(--sky-600)' : 'var(--text-muted)',
                  boxShadow: signupType === 'student' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <GraduationCap size={15} />
                <span>Student & Senior (ID Card)</span>
              </button>
              <button
                type="button"
                onClick={() => { setSignupType('club_admin'); setError(''); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 9,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: signupType === 'club_admin' ? 'var(--card-bg)' : 'transparent',
                  color: signupType === 'club_admin' ? 'var(--sky-600)' : 'var(--text-muted)',
                  boxShadow: signupType === 'club_admin' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShieldCheck size={15} />
                <span>Club Admin Signup</span>
              </button>
            </div>

            {/* ─── CLUB ADMIN SIGNUP SUB-FLOW ─── */}
            {signupType === 'club_admin' && (
              <div>
                {clubAdminSuccess ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 14,
                    border: '1px solid #bbf7d0',
                  }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}>
                      <CheckCircle2 size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
                      Application Submitted for Verification!
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
                      {clubAdminSuccessMsg || `Your club administrator account for "${clubAdminClubName}" is awaiting review by the College Administrator.`}
                    </p>
                    <div style={{
                      background: 'rgba(2, 132, 199, 0.08)',
                      border: '1px solid rgba(2, 132, 199, 0.2)',
                      padding: '12px 14px',
                      borderRadius: 10,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      textAlign: 'left',
                      marginBottom: 20,
                    }}>
                      ℹ️ <strong>What happens next?</strong> Once the institute administrator approves your request in the Admin Verification dashboard, you will be able to log in directly with your email <strong>{clubAdminEmail}</strong> and password to publish events and recruit members.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClubAdminSuccess(false);
                        setMode('login');
                        setLoginEmail(clubAdminEmail);
                      }}
                      className="btn btn-primary"
                      style={{
                        padding: '10px 24px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>Proceed to Sign In</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleClubAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      background: 'rgba(2, 132, 199, 0.08)',
                      border: '1px solid rgba(2, 132, 199, 0.25)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      <ShieldCheck size={20} color="#0284c7" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>No Roll Number or ID card needed.</strong> College club leads only need to provide their official college email, club name, and password for administrative verification.
                      </div>
                    </div>

                    {error && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#dc2626',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                        Lead / Representative Full Name *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <UserIcon size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="e.g. Atharva Kulkarni (President)"
                          value={clubAdminName}
                          onChange={(e) => setClubAdminName(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 36px',
                            borderRadius: 9,
                            border: '1px solid var(--border-color)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                        <span>College Email Address *</span>
                        {clubAdminEmail && (
                          <span style={{ color: isPictEmail(clubAdminEmail) ? '#16a34a' : '#dc2626', fontSize: '0.72rem' }}>
                            {isPictEmail(clubAdminEmail) ? '✓ Valid PICT Domain' : 'Must end in @pict.edu or @ms.pict.edu'}
                          </span>
                        )}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                        <input
                          type="email"
                          placeholder="e.g. club.lead@pict.edu"
                          value={clubAdminEmail}
                          onChange={(e) => setClubAdminEmail(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 36px',
                            borderRadius: 9,
                            border: `1px solid ${clubAdminEmail ? (isPictEmail(clubAdminEmail) ? '#22c55e' : '#ef4444') : 'var(--border-color)'}`,
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                        College Club Name *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Building2 size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="e.g. PICT Robotics Club, CSI, ACM, DebSoc..."
                          value={clubAdminClubName}
                          onChange={(e) => setClubAdminClubName(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 36px',
                            borderRadius: 9,
                            border: '1px solid var(--border-color)',
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                        Lead Phone / WhatsApp <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        value={clubAdminPhone}
                        onChange={(e) => setClubAdminPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 9,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                          Password *
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showClubAdminPassword ? 'text' : 'password'}
                            placeholder="Min 8 chars, mixed"
                            value={clubAdminPassword}
                            onChange={(e) => setClubAdminPassword(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '9px 32px 9px 10px',
                              borderRadius: 9,
                              border: '1px solid var(--border-color)',
                              background: 'var(--card-bg)',
                              color: 'var(--text-main)',
                              fontSize: '0.85rem',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowClubAdminPassword(!showClubAdminPassword)}
                            style={{ position: 'absolute', right: 8, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            {showClubAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                          Confirm Password *
                        </label>
                        <input
                          type={showClubAdminPassword ? 'text' : 'password'}
                          placeholder="Re-type password"
                          value={clubAdminConfirmPassword}
                          onChange={(e) => setClubAdminConfirmPassword(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 9,
                            border: `1px solid ${clubAdminConfirmPassword ? (clubAdminPassword === clubAdminConfirmPassword ? '#22c55e' : '#ef4444') : 'var(--border-color)'}`,
                            background: 'var(--card-bg)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingClubAdmin}
                      style={{
                        marginTop: 8,
                        padding: '11px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: isSubmittingClubAdmin ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                      }}
                    >
                      {isSubmittingClubAdmin ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Submitting Registration Request...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={17} />
                          <span>Register as Club Administrator</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ─── STUDENT SIGNUP SUB-FLOW (WITH ID CARD OCR) ─── */}
            {signupType === 'student' && (
              <div>
                {/* Step Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                  {[
                    { num: 1, label: 'Credentials' },
                    { num: 2, label: 'ID Card Upload' },
                    { num: 3, label: 'Confirm Year' },
                  ].map((s, idx) => (
                    <React.Fragment key={s.num}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: signupStep >= s.num ? 'var(--sky-500)' : 'var(--bg-secondary)',
                          color: signupStep >= s.num ? '#fff' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: signupStep >= s.num ? 'none' : '1px solid var(--border-color)',
                        }}>
                          {signupStep > s.num ? <Check size={14} /> : s.num}
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: signupStep === s.num ? 700 : 500,
                          color: signupStep === s.num ? 'var(--text-main)' : 'var(--text-muted)',
                        }}>
                          {s.label}
                        </span>
                      </div>
                      {idx < 2 && (
                        <div style={{
                          width: 24,
                          height: 2,
                          background: signupStep > s.num ? 'var(--sky-500)' : 'var(--border-color)',
                        }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* ── STEP 1: CREDENTIALS ── */}
            {signupStep === 1 && (
              <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                    <span>Official PICT Email *</span>
                    {email && (
                      <span style={{ color: isPictEmail(email) ? '#16a34a' : '#dc2626', fontSize: '0.72rem' }}>
                        {isPictEmail(email) ? '✓ Valid PICT Domain' : 'Must end in @pict.edu or @ms.pict.edu'}
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      placeholder="e.g. aarav.sharma@pict.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: 9,
                        border: `1px solid ${email ? (isPictEmail(email) ? '#22c55e' : '#ef4444') : 'var(--border-color)'}`,
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                      Roll Number *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Hash size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="e.g. 24CS042"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 10px 9px 32px',
                          borderRadius: 9,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                      Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <UserIcon size={16} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="e.g. Aarav Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px 9px 32px',
                          borderRadius: 9,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                    Department / Branch
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 9,
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    {branches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Password *
                    </label>
                    {password && (
                      <span style={{ fontSize: '0.72rem', color: passwordScore >= 4 ? '#16a34a' : passwordScore >= 3 ? '#eab308' : '#dc2626' }}>
                        {passwordScore >= 4 ? 'Strong' : passwordScore >= 3 ? 'Medium' : 'Weak'}
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 36px',
                        borderRadius: 9,
                        border: '1px solid var(--border-color)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                    Confirm Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: 9,
                        border: `1px solid ${confirmPassword ? (password === confirmPassword ? '#22c55e' : '#ef4444') : 'var(--border-color)'}`,
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: isApplyingSenior ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-secondary)',
                  border: `1px solid ${isApplyingSenior ? 'var(--sky-400)' : 'var(--border-color)'}`,
                  marginTop: 2,
                }}>
                  <input
                    type="checkbox"
                    checked={isApplyingSenior}
                    onChange={(e) => setIsApplyingSenior(e.target.checked)}
                    style={{ marginTop: 3, cursor: 'pointer' }}
                  />
                  <span>
                    <strong style={{ color: isApplyingSenior ? 'var(--sky-700)' : 'var(--text-main)' }}>
                      Register as Senior Student Mentor / Contributor
                    </strong>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      For 3rd & 4th Year PICT seniors. Requires college ID card verification and Administrator approval before academic/skill changes can be made.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  style={{
                    marginTop: 8,
                    padding: '10px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>Continue to ID Card Upload</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* ── STEP 2: ID CARD UPLOAD ── */}
            {signupStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--sky-50)',
                  border: '1px solid var(--sky-200)',
                  fontSize: '0.8rem',
                  color: 'var(--sky-800)',
                  lineHeight: 1.45,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>📸 How to capture your ID card:</div>
                  • Lay ID card flat with good lighting (avoid heavy camera flash or glare)<br />
                  • Ensure the batch years (e.g., <strong>2023-2027</strong>) and Roll Number are legible<br />
                  • AI Vision automatically reads the batch and assigns your year
                </div>

                {/* Upload Zone */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                />

                {!imagePreviewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--sky-300)',
                      borderRadius: 12,
                      padding: '28px 16px',
                      textAlign: 'center',
                      background: 'rgba(2, 132, 199, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--sky-100)',
                      color: 'var(--sky-600)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}>
                      <Camera size={22} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: 2 }}>
                      Click to upload or take a photo
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Supports JPG, PNG, WebP up to 10MB
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <img
                      src={imagePreviewUrl}
                      alt="College ID Preview"
                      style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#000' }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--card-bg)',
                      borderTop: '1px solid var(--border-color)',
                      fontSize: '0.78rem',
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {idCardFile?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--sky-600)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <RefreshCw size={12} />
                        Change Photo
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    disabled={isAnalyzingId}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleUploadAndAnalyze}
                    disabled={!idCardFile || isAnalyzingId}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: !idCardFile || isAnalyzingId ? 'var(--border-color)' : 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      color: !idCardFile || isAnalyzingId ? 'var(--text-muted)' : '#fff',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: !idCardFile || isAnalyzingId ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: idCardFile && !isAnalyzingId ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                    }}
                  >
                    {isAnalyzingId ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Extracting Batch & Year...</span>
                      </>
                    ) : (
                      <>
                        <span>Analyze & Verify ID</span>
                        <Sparkles size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: ACADEMIC YEAR CONFIRMATION ── */}
            {signupStep === 3 && analysisResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Result Card */}
                <div style={{
                  padding: 16,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(56, 189, 248, 0.03))',
                  border: '1px solid var(--sky-200)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={18} color="#0284c7" />
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--sky-900)' }}>
                        AI Analysis Complete
                      </span>
                    </div>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: analysisResult.confidence === 'high' ? '#dcfce7' : analysisResult.confidence === 'medium' ? '#fef9c3' : '#fee2e2',
                      color: analysisResult.confidence === 'high' ? '#15803d' : analysisResult.confidence === 'medium' ? '#a16207' : '#b91c1c',
                    }}>
                      {analysisResult.confidence.toUpperCase()} CONFIDENCE
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
                    <div style={{ background: 'var(--card-bg)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Detected Batch</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginTop: 2 }}>
                        {analysisResult.batchYears
                          ? analysisResult.batchYears
                          : (analysisResult.batchStartYear && analysisResult.batchEndYear)
                            ? `${analysisResult.batchStartYear}-${analysisResult.batchEndYear}`
                            : 'Manual Review'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--card-bg)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Classified Level</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sky-600)', marginTop: 2 }}>
                        {analysisResult.displayLabel}
                      </div>
                    </div>

                    {analysisResult.rollNumber && (
                      <div style={{ background: 'var(--card-bg)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>ID Roll Number</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                          {analysisResult.rollNumber}
                        </div>
                      </div>
                    )}

                    {analysisResult.studentName && (
                      <div style={{ background: 'var(--card-bg)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Extracted Name</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {analysisResult.studentName}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(analysisResult.yearOfStudy >= 2 || isApplyingSenior) && (
                  <div style={{
                    padding: '11px 13px',
                    borderRadius: 10,
                    background: 'rgba(2, 132, 199, 0.08)',
                    border: '1px solid var(--sky-200)',
                    fontSize: '0.78rem',
                    color: 'var(--sky-900)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    lineHeight: 1.45,
                  }}>
                    <ShieldCheck size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: 2 }}>Senior Student Mentor Account</strong>
                      Your academic seniority qualifies for Senior Mentor status. You can sign in immediately to explore all resources; uploading & editing privileges for Academics, Skills, Scholarships, and Placements will activate as soon as the Institute Admin verifies your college ID.
                    </div>
                  </div>
                )}

                {/* Confirm question */}
                {!isFlaggedIncorrect ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', textAlign: 'center', fontWeight: 600 }}>
                      Is the detected classification (<strong>{analysisResult.displayLabel}</strong>) correct?
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setIsFlaggedIncorrect(true)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: 10,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        Looks Wrong
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFinalizeSignup(true)}
                        disabled={isFinalizing}
                        style={{
                          flex: 2,
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: isFinalizing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                        }}
                      >
                        {isFinalizing ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Confirming...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Yes, Confirm & Enter</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Manual Flagging for Admin Review */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Request Faculty / Admin Review
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Your Actual Year of Study
                      </label>
                      <select
                        value={manualRequestedLevel}
                        onChange={(e) => setManualRequestedLevel(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <option value="Fresher">1st Year (Fresher)</option>
                        <option value="SecondYear">2nd Year</option>
                        <option value="ThirdYear">3rd Year</option>
                        <option value="FinalYear">Final Year (4th Year)</option>
                        <option value="Alumni">Passed Out Student (Alumni)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Optional Note for Reviewer
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Direct Second Year Admission"
                        value={manualNote}
                        onChange={(e) => setManualNote(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setIsFlaggedIncorrect(false)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFinalizeSignup(false)}
                        disabled={isFinalizing}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#ea580c',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: isFinalizing ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isFinalizing ? 'Submitting...' : 'Submit for Admin Review & Enter'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
