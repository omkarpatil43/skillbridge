import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  UserCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Loader2,
  Building2,
} from 'lucide-react';
import { api } from '../services/api';

interface SetupPageProps {
  onSetupSuccess?: () => void;
  onRedirectToLogin?: () => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({
  onSetupSuccess,
  onRedirectToLogin,
}) => {
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);
  const [step, setStep] = useState<'step1' | 'step2' | 'success'>('step1');

  // Step 1 State
  const [accessKey, setAccessKey] = useState<string>('');
  const [showAccessKey, setShowAccessKey] = useState<boolean>(false);
  const [step1Loading, setStep1Loading] = useState<boolean>(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // In-Memory Token State (never persisted)
  const [setupToken, setSetupToken] = useState<string | null>(null);

  // Step 2 Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [step2Loading, setStep2Loading] = useState<boolean>(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Check setup status on load
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const { hasAdmin } = await api.getSetupStatus();
        if (hasAdmin) {
          // Redirect immediately if an admin already exists
          if (onRedirectToLogin) {
            onRedirectToLogin();
          } else {
            window.location.href = '/login';
          }
          return;
        }
        if (isMounted) setCheckingStatus(false);
      } catch (err) {
        console.error('Status check error:', err);
        if (isMounted) setCheckingStatus(false);
      }
    };
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [onRedirectToLogin]);

  // Clean up in-memory token on unmount
  useEffect(() => {
    return () => {
      setSetupToken(null);
    };
  }, []);

  // Password strength meter calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 10) score += 25;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 25;
    if (/\d/.test(pass)) score += 25;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass)) score += 25;
    return score;
  };

  const passwordStrength = getPasswordStrength(password);

  const getStrengthLabel = (score: number) => {
    if (score <= 25) return { label: 'Weak', color: '#ef4444' };
    if (score <= 50) return { label: 'Fair', color: '#f59e0b' };
    if (score <= 75) return { label: 'Good', color: '#3b82f6' };
    return { label: 'Strong & Secure', color: '#10b981' };
  };

  // Step 1 Submission: Verify Setup Access Key
  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    if (!accessKey.trim()) {
      setStep1Error('Invalid key or setup already completed.');
      return;
    }

    setStep1Loading(true);
    try {
      const res = await api.verifySetupKey(accessKey.trim());
      if (res.success && res.setupToken) {
        setSetupToken(res.setupToken);
        setStep('step2');
      } else if (res.isRateLimited) {
        setStep1Error('Too many attempts. Please try again later.');
      } else {
        // Generic error message for security to avoid leaking system state
        setStep1Error('Invalid key or setup already completed.');
      }
    } catch {
      setStep1Error('Invalid key or setup already completed.');
    } finally {
      setStep1Loading(false);
    }
  };

  // Step 2 Submission: Create College Administrator Account
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error(null);
    setFieldErrors({});

    const errors: { [key: string]: string } = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Full name is required (min 2 characters).';
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.endsWith('@pict.edu')) {
      errors.email = 'Email must end with official domain @pict.edu';
    }

    if (password.length < 10) {
      errors.password = 'Password must be at least 10 characters long.';
    } else if (passwordStrength < 75) {
      errors.password = 'Password must include uppercase, lowercase, number, and symbol.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!setupToken) {
      setStep2Error('Your setup session expired. Please re-enter the setup key to continue.');
      setStep('step1');
      return;
    }

    setStep2Loading(true);
    try {
      const res = await api.createAdmin({
        setupToken,
        name: name.trim(),
        email: trimmedEmail,
        password,
      });

      if (res.success) {
        // Immediately clear token from memory
        setSetupToken(null);
        setStep('success');
        if (onSetupSuccess) onSetupSuccess();
      } else {
        if (
          res.error?.toLowerCase().includes('expired') ||
          res.error?.toLowerCase().includes('token')
        ) {
          setSetupToken(null);
          setStep1Error('Your setup session expired. Please re-enter the setup key to continue.');
          setStep('step1');
        } else {
          setStep2Error(res.error || 'Failed to create administrative account.');
        }
      }
    } catch {
      setStep2Error('An unexpected error occurred. Please check your network and try again.');
    } finally {
      setStep2Loading(false);
    }
  };

  // If checking status, show minimalist console loader
  if (checkingStatus) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: '#64748b',
        }}
      >
        <Loader2 className="animate-spin" size={36} color="#6366f1" />
        <span style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
          Initializing Administrative Console Check...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'radial-gradient(circle at top, #0f172a 0%, #020617 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          color: '#f8fafc',
        }}
      >
        {/* Header Console Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                SkillBridge Console
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                INITIAL SYSTEM PROVISIONING WIZARD
              </span>
            </div>
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
              background: step === 'success' ? '#065f46' : '#1e1b4b',
              color: step === 'success' ? '#34d399' : '#818cf8',
              border: `1px solid ${step === 'success' ? '#047857' : '#3730a3'}`,
            }}
          >
            {step === 'step1' && 'STEP 1 / 2'}
            {step === 'step2' && 'STEP 2 / 2'}
            {step === 'success' && 'COMPLETE'}
          </div>
        </div>

        {/* ── STEP 1: KEY ENTRY ── */}
        {step === 'step1' && (
          <form onSubmit={handleVerifyKey}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <Key size={26} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
                Enter Setup Access Key
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                Provide the master setup access key configured in environment settings.
              </p>
            </div>

            {step1Error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{step1Error}</span>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Setup Access Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAccessKey ? 'text' : 'password'}
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Enter 64-character hex key..."
                  disabled={step1Loading}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    background: '#020617',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAccessKey(!showAccessKey)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {showAccessKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span
                style={{
                  display: 'block',
                  marginTop: '8px',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  lineHeight: '1.4',
                }}
              >
                🔒 This is a one-time setup step for creating the platform's first administrator account.
              </span>
            </div>

            <button
              type="submit"
              disabled={step1Loading || !accessKey.trim()}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                background: step1Loading || !accessKey.trim() ? '#334155' : 'linear-gradient(135deg, #4f46e5, #0284c7)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                border: 'none',
                cursor: step1Loading || !accessKey.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {step1Loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: CREATE ADMIN FORM ── */}
        {step === 'step2' && (
          <form onSubmit={handleCreateAdmin}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px auto',
                }}
              >
                <UserCheck size={24} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>
                Create Administrator Account
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Set credentials for the primary College Administrator account.
              </p>
            </div>

            {step2Error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} color="#ef4444" />
                <span>{step2Error}</span>
              </div>
            )}

            {/* Full Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. K. S. Verma"
                disabled={step2Loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#020617',
                  border: `1px solid ${fieldErrors.name ? '#ef4444' : '#334155'}`,
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {fieldErrors.name && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.name}
                </span>
              )}
            </div>

            {/* College Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Official College Email (@pict.edu)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin.office@pict.edu"
                disabled={step2Loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#020617',
                  border: `1px solid ${fieldErrors.email ? '#ef4444' : '#334155'}`,
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {fieldErrors.email && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Password (min 10 chars)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={step2Loading}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 12px',
                    borderRadius: '8px',
                    background: '#020617',
                    border: `1px solid ${fieldErrors.password ? '#ef4444' : '#334155'}`,
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength Meter Bar */}
              {password.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Strength:</span>
                    <span style={{ color: getStrengthLabel(passwordStrength).color, fontWeight: 600 }}>
                      {getStrengthLabel(passwordStrength).label}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${passwordStrength}%`,
                        background: getStrengthLabel(passwordStrength).color,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={step2Loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#020617',
                  border: `1px solid ${fieldErrors.confirmPassword ? '#ef4444' : '#334155'}`,
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {fieldErrors.confirmPassword && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={step2Loading}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                background: step2Loading ? '#334155' : 'linear-gradient(135deg, #059669, #0284c7)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                border: 'none',
                cursor: step2Loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {step2Loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Create College Administrator</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ── SUCCESS SCREEN ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={36} color="#10b981" />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
              System Provisioned Successfully!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '24px' }}>
              College Administrator account created for <strong>{name}</strong> (<code>{email}</code>).
              The initial setup wizard is now permanently locked.
            </p>

            <button
              type="button"
              onClick={() => {
                if (onRedirectToLogin) {
                  onRedirectToLogin();
                } else {
                  window.location.href = '/login';
                }
              }}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5, #0284c7)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Lock size={18} />
              <span>Go to Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
