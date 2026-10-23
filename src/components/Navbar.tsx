import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, Users, MessageSquareCode, Bot, Briefcase, Award,
  Home, User as UserIcon, LogOut, Sparkles, Menu, X,
  ShieldCheck, Mail, Hash, Calendar, Moon, Sun, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAuthModal: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, openAuthModal, darkMode, toggleDarkMode }) => {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'branch', label: 'Branch Hub', icon: BookOpen },
    { id: 'clubs', label: 'Clubs', icon: Users },
    { id: 'doubts', label: 'Doubt Chat', icon: MessageSquareCode },
    { id: 'chat', label: 'Campus Chat', icon: MessageSquare },
    { id: 'ai-chatbot', label: 'AI Chatbot', icon: Bot },
    { id: 'placement', label: 'Placements', icon: Briefcase },
    { id: 'scholarships', label: 'Scholarships', icon: Award },
    ...(currentUser?.role === 'college_admin'
      ? [{ id: 'admin-verification', label: 'Admin Review', icon: ShieldCheck }]
      : []),
  ];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'senior': return 'Senior Mentor';
      case 'college_admin': return 'Institute Admin';
      case 'club_admin': return 'Club Lead';
      default: return 'Student';
    }
  };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--sky-200)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        maxWidth: 1320, margin: '0 auto', padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Brand */}
        <div
          onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'var(--sky-500)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff',
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--sky-900)', letterSpacing: '-0.02em' }}>
              Skill<span style={{ color: 'var(--sky-500)' }}>Bridge</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--sky-600)' }}>Campus Academic Portal</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--sky-100)' : 'transparent',
                  border: isActive ? '1px solid var(--sky-300)' : '1px solid transparent',
                  color: isActive ? 'var(--sky-700)' : 'var(--sky-600)',
                  fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Auth Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={toggleDarkMode}
            className="theme-toggle"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {currentUser ? (
            <>
              {/* User Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 12px 4px 4px', borderRadius: 'var(--radius-full)',
                    background: 'var(--sky-50)', border: '1px solid var(--sky-200)', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--sky-500)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700,
                  }}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sky-800)' }} className="username-label">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute', right: 0, top: '110%', width: 300,
                      background: '#fff', border: '1px solid var(--sky-200)',
                      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                      padding: 16, zIndex: 200,
                    }}
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--sky-900)' }}>{currentUser.name}</div>
                      <span className="badge" style={{ marginTop: 6 }}>{getRoleLabel(currentUser.role)}</span>
                    </div>

                    <div className="user-info-panel" style={{ marginBottom: 14 }}>
                      <div className="user-info-row">
                        <span className="user-info-label"><Mail size={12} style={{ marginRight: 4 }} />Email</span>
                        <span className="user-info-value">{currentUser.email}</span>
                      </div>
                      <div className="user-info-row">
                        <span className="user-info-label"><Hash size={12} style={{ marginRight: 4 }} />Roll No</span>
                        <span className="user-info-value">{currentUser.rollNo}</span>
                      </div>
                      <div className="user-info-row">
                        <span className="user-info-label"><BookOpen size={12} style={{ marginRight: 4 }} />Branch</span>
                        <span className="user-info-value">{currentUser.branch}</span>
                      </div>
                      <div className="user-info-row">
                        <span className="user-info-label"><Calendar size={12} style={{ marginRight: 4 }} />Year</span>
                        <span className="user-info-value">{currentUser.year}</span>
                      </div>
                      {currentUser.batchStartYear && currentUser.batchEndYear && (
                        <div className="user-info-row">
                          <span className="user-info-label"><Calendar size={12} style={{ marginRight: 4 }} />Batch</span>
                          <span className="user-info-value">{currentUser.batchStartYear} â€“ {currentUser.batchEndYear}</span>
                        </div>
                      )}
                      <div className="user-info-row">
                        <span className="user-info-label"><ShieldCheck size={12} style={{ marginRight: 4 }} />ID Status</span>
                        <span
                          className="user-info-value"
                          style={{
                            fontWeight: 700,
                            color:
                              currentUser.verificationStatus === 'Verified'
                                ? '#16a34a'
                                : currentUser.verificationStatus === 'Rejected'
                                ? '#dc2626'
                                : '#ea580c',
                          }}
                        >
                          {currentUser.verificationStatus || 'Verified'}
                        </span>
                      </div>
                      {currentUser.clubName && (
                        <div className="user-info-row">
                          <span className="user-info-label"><Users size={12} style={{ marginRight: 4 }} />Club</span>
                          <span className="user-info-value">{currentUser.clubName}</span>
                        </div>
                      )}
                      {currentUser.reputation !== undefined && (
                        <div className="user-info-row">
                          <span className="user-info-label"><Sparkles size={12} style={{ marginRight: 4 }} />Reputation</span>
                          <span className="user-info-value">{currentUser.reputation} pts</span>
                        </div>
                      )}
                      {currentUser.bio && (
                        <div className="user-info-row" style={{ flexDirection: 'column', gap: 4 }}>
                          <span className="user-info-label">Bio</span>
                          <span className="user-info-value" style={{ fontWeight: 400, fontSize: '0.8rem' }}>{currentUser.bio}</span>
                        </div>
                      )}
                      {currentUser.badges && currentUser.badges.length > 0 && (
                        <div className="user-info-row" style={{ flexDirection: 'column', gap: 6 }}>
                          <span className="user-info-label">Badges</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {currentUser.badges.map(b => (
                              <span key={b} className="badge">{b}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="btn btn-danger"
                      style={{ width: '100%' }}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={openAuthModal} className="btn btn-primary btn-sm">
              <UserIcon size={16} /> Sign In
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--sky-800)', cursor: 'pointer', padding: 6 }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--sky-200)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--sky-500)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--sky-700)',
                  border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <Icon size={20} /> {item.label}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 990px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .username-label { display: none !important; }
        }
      `}</style>
    </header>
  );
};
