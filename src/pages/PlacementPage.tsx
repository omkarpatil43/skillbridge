import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';
import { CompanyPlacementInfo } from '../types';
import {
  Briefcase,
  TrendingUp,
  Building,
  CheckCircle2,
  ExternalLink,
  Search,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Clock,
} from 'lucide-react';

interface PrepTrackItem {
  id: string;
  title: string;
  category: string;
  topics: string[];
  hours: string;
  link: string;
  badge: string;
  badgeClass: string;
}

export const PlacementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { companies, addCompany, updateCompany, removeCompany } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(companies[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'companies' | 'tracks' | 'stats'>('companies');

  // Add & Edit Company Form states
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [companyTier, setCompanyTier] = useState<CompanyPlacementInfo['tier']>('Standard (6-12 LPA)');
  const [companyPackage, setCompanyPackage] = useState('');
  const [companyEligibleBranches, setCompanyEligibleBranches] = useState('Computer Science & Engg, Information Technology');
  const [companyHiringRounds, setCompanyHiringRounds] = useState('Online Test, Technical Round 1, Technical Round 2, HR Round');
  const [companyRequiredSkills, setCompanyRequiredSkills] = useState('Data Structures, C++, System Design, SQL');
  const [companyDriveLink, setCompanyDriveLink] = useState('');
  const [companyLogo, setCompanyLogo] = useState('https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=160&q=80');
  const [companyOverview, setCompanyOverview] = useState('');

  const canManageCompanies = Boolean(
    currentUser && (
      ['college_admin', 'admin'].includes(currentUser.role) ||
      (currentUser.role === 'senior' && currentUser.verificationStatus === 'Verified')
    )
  );
  const isPendingSenior = Boolean(currentUser && currentUser.role === 'senior' && currentUser.verificationStatus !== 'Verified');
  const [isEditStatsOpen, setIsEditStatsOpen] = useState(false);
  const [placementStats, setPlacementStats] = useState(() => {
    const saved = localStorage.getItem('skillbridge_placement_stats_v1');
    const defaults = {
      highestCtc: '₹45.0 LPA',
      averageCtc: '₹14.2 LPA',
      placementRate: '94.6%',
      companiesVisited: '180+',
      dreamOffers: '64 Offers',
      note: 'Students maintaining >7.5 CGPA with at least 2 full-stack/AI production projects and 300+ LeetCode problems consistently qualify for Round 2 technical interviews across all Dream recruiters.',
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  const [statsDraft, setStatsDraft] = useState(placementStats);

  // Preparation Tracks state & handlers
  const [prepTracks, setPrepTracks] = useState<PrepTrackItem[]>(() => {
    const saved = localStorage.getItem('skillbridge_prep_tracks_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'track-1',
        title: 'Top 75 High-Yield DSA Problem Sheet',
        category: 'Coding Assessments',
        topics: ['Two Pointers & Sliding Window', 'Trees & BST Lowest Common Ancestor', 'Graph Traversal & Shortest Path', '1D & 2D Dynamic Programming'],
        hours: '60 Hours',
        link: 'https://leetcode.com/problemset/all/',
        badge: 'Tier-1 Essential',
        badgeClass: 'badge-emerald',
      },
      {
        id: 'track-2',
        title: 'Core Computer Science Essentials (OS, DBMS, CN)',
        category: 'Technical Rounds',
        topics: ['Transactions & ACID Isolation Levels', 'Virtual Memory & Page Faults', 'TCP Sliding Window & 3-Way Handshake', 'OOP Design Patterns (Factory, Singleton)'],
        hours: '35 Hours',
        link: 'https://www.geeksforgeeks.org/last-minute-notes-computer-science-subjects/',
        badge: 'Mandatory',
        badgeClass: 'badge-indigo',
      },
      {
        id: 'track-3',
        title: 'Low Level & High Level System Design (LLD / HLD)',
        category: 'SDE-1 / SDE-2 Rounds',
        topics: ['Distributed Rate Limiter Design', 'URL Shortener (Bitly Architecture)', 'Consistent Hashing & Cache Invalidation', 'Message Queues (Kafka / RabbitMQ)'],
        hours: '40 Hours',
        link: 'https://github.com/donnemartin/system-design-primer',
        badge: 'Dream Package Focus',
        badgeClass: 'badge-senior',
      },
      {
        id: 'track-4',
        title: 'Quantitative Aptitude, Logical & Verbal Reasoning',
        category: 'Screening Tests',
        topics: ['Time, Speed & Distance', 'Pipes & Cisterns, Permutations', 'Syllogisms & Blood Relations', 'Data Interpretation & Graphs'],
        hours: '25 Hours',
        link: 'https://www.indiabix.com/',
        badge: 'Mass & Product Drives',
        badgeClass: 'badge-amber',
      },
    ];
  });

  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [isEditTrackOpen, setIsEditTrackOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  const [trackTitle, setTrackTitle] = useState('');
  const [trackCategory, setTrackCategory] = useState('Coding Assessments');
  const [trackTopics, setTrackTopics] = useState('');
  const [trackHours, setTrackHours] = useState('40 Hours');
  const [trackLink, setTrackLink] = useState('');
  const [trackBadge, setTrackBadge] = useState('Recommended');
  const [trackBadgeClass, setTrackBadgeClass] = useState('badge-emerald');

  const savePrepTracks = (tracks: PrepTrackItem[]) => {
    setPrepTracks(tracks);
    localStorage.setItem('skillbridge_prep_tracks_v2', JSON.stringify(tracks));
  };

  const handleOpenAddTrack = () => {
    setTrackTitle('');
    setTrackCategory('Coding Assessments');
    setTrackTopics('Arrays & Strings, Dynamic Programming, Core CS');
    setTrackHours('40 Hours');
    setTrackLink('https://leetcode.com');
    setTrackBadge('High Yield');
    setTrackBadgeClass('badge-emerald');
    setIsAddTrackOpen(true);
  };

  const handleCreateTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle.trim() || !trackLink.trim()) return;

    const newTrack: PrepTrackItem = {
      id: `track-${Date.now()}`,
      title: trackTitle.trim(),
      category: trackCategory.trim(),
      topics: trackTopics.split(',').map(t => t.trim()).filter(Boolean),
      hours: trackHours.trim(),
      link: trackLink.trim(),
      badge: trackBadge.trim(),
      badgeClass: trackBadgeClass,
    };

    savePrepTracks([...prepTracks, newTrack]);
    setIsAddTrackOpen(false);
  };

  const handleOpenEditTrack = (track: PrepTrackItem) => {
    setEditingTrackId(track.id);
    setTrackTitle(track.title);
    setTrackCategory(track.category);
    setTrackTopics(track.topics ? track.topics.join(', ') : '');
    setTrackHours(track.hours);
    setTrackLink(track.link);
    setTrackBadge(track.badge);
    setTrackBadgeClass(track.badgeClass || 'badge-emerald');
    setIsEditTrackOpen(true);
  };

  const handleSaveEditTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrackId || !trackTitle.trim()) return;

    const updated = prepTracks.map(t => {
      if (t.id === editingTrackId) {
        return {
          ...t,
          title: trackTitle.trim(),
          category: trackCategory.trim(),
          topics: trackTopics.split(',').map(top => top.trim()).filter(Boolean),
          hours: trackHours.trim(),
          link: trackLink.trim(),
          badge: trackBadge.trim(),
          badgeClass: trackBadgeClass,
        };
      }
      return t;
    });

    savePrepTracks(updated);
    setIsEditTrackOpen(false);
    setEditingTrackId(null);
  };

  const handleRemoveTrack = (id: string) => {
    const updated = prepTracks.filter(t => t.id !== id);
    savePrepTracks(updated);
  };

  const handleOpenAddCompany = () => {
    setCompanyName('');
    setCompanyTier('Standard (6-12 LPA)');
    setCompanyPackage('10 LPA');
    setCompanyEligibleBranches('Computer Science & Engg, Information Technology, Electronics & Communication');
    setCompanyHiringRounds('Online Test, Technical Round 1, Technical Round 2, HR Round');
    setCompanyRequiredSkills('Data Structures, C++, System Design, SQL');
    setCompanyDriveLink('');
    setCompanyLogo('https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=160&q=80');
    setCompanyOverview('Official campus placement drive with structured interview rounds and roadmap preparation details.');
    setIsAddCompanyOpen(true);
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !companyPackage.trim()) return;

    addCompany({
      name: companyName.trim(),
      logo: companyLogo.trim() || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=160&q=80',
      tier: companyTier,
      packageLPA: companyPackage.trim(),
      eligibleBranches: companyEligibleBranches.split(',').map(b => b.trim()).filter(Boolean),
      hiringRounds: companyHiringRounds.split(',').map(r => r.trim()).filter(Boolean),
      importantTopics: companyRequiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      prepRoadmapLink: companyDriveLink.trim() || '#',
      driveLink: companyDriveLink.trim() || '#',
      overview: companyOverview.trim() || 'Campus preparation guide and hiring details.',
      recentInterviewExperiences: [],
    });

    setIsAddCompanyOpen(false);
  };

  const handleOpenEditCompany = (comp: CompanyPlacementInfo) => {
    setEditingCompanyId(comp.id);
    setCompanyName(comp.name);
    setCompanyTier(comp.tier);
    setCompanyPackage(comp.packageLPA);
    setCompanyEligibleBranches(comp.eligibleBranches ? comp.eligibleBranches.join(', ') : '');
    setCompanyHiringRounds(comp.hiringRounds ? comp.hiringRounds.join(', ') : '');
    setCompanyRequiredSkills(comp.importantTopics ? comp.importantTopics.join(', ') : '');
    setCompanyDriveLink(comp.driveLink || '');
    setCompanyLogo(comp.logo || '');
    setCompanyOverview(comp.overview || '');
    setIsEditCompanyOpen(true);
  };

  const handleSaveEditCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyId || !companyName.trim()) return;

    updateCompany(editingCompanyId, {
      name: companyName.trim(),
      logo: companyLogo.trim(),
      tier: companyTier,
      packageLPA: companyPackage.trim(),
      eligibleBranches: companyEligibleBranches.split(',').map(b => b.trim()).filter(Boolean),
      hiringRounds: companyHiringRounds.split(',').map(r => r.trim()).filter(Boolean),
      importantTopics: companyRequiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      prepRoadmapLink: companyDriveLink.trim(),
      driveLink: companyDriveLink.trim(),
      overview: companyOverview.trim(),
    });

    setIsEditCompanyOpen(false);
    setEditingCompanyId(null);
  };

  const tiers = [
    'All',
    'Dream (20+ LPA)',
    'Super Dream (12-20 LPA)',
    'Standard (6-12 LPA)',
    'Mass / Service (3.5-6 LPA)',
  ];

  const filteredCompanies = companies.filter(c => {
    const matchTier = selectedTier === 'All' || c.tier === selectedTier;
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.importantTopics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTier && matchSearch;
  });

  return (
    <div className="animate-fade-in">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(16, 185, 129, 0.15) 100%)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        marginBottom: 28,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#34d399',
            marginBottom: 6,
          }}>
            <Briefcase size={14} /> Training & Placement Cell Playbook
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Campus <span className="gradient-text">Placement & Career</span> Guide
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 680, fontSize: '0.95rem' }}>
            Official company hiring pipelines, CTC breakdown insights, previous student interview experiences, curated DSA problem sheets, and master preparation drives.
          </p>
        </div>

        {/* Quick Stat Pill */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ padding: 10, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{placementStats.highestCtc}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highest Campus CTC (2025-26)</div>
          </div>
        </div>

        {canManageCompanies && (
          <button className="btn btn-primary" onClick={handleOpenAddCompany}>
            <Building size={16} /> Add company card
          </button>
        )}

        {isPendingSenior && (
          <div style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid var(--sky-200)',
            fontSize: '0.8rem',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Clock size={16} color="#0284c7" />
            <span>Senior verification pending admin review to publish company guides</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--border-glass)',
        paddingBottom: 16,
        marginBottom: 24,
      }}>
        <button
          onClick={() => setActiveTab('companies')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'companies' ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: activeTab === 'companies' ? '#080c14' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          <Building size={18} /> Company Roadmaps & Drives ({companies.length})
        </button>

        <button
          onClick={() => setActiveTab('tracks')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'tracks' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          <Target size={18} /> Preparation Tracks & Sheets ({prepTracks.length})
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'stats' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: activeTab === 'stats' ? '#080c14' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          <TrendingUp size={18} /> Campus Placement Statistics
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY ROADMAPS */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="animate-fade-in">
          {/* Filter Bar */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tiers.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: selectedTier === t ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.05)',
                    border: selectedTier === t ? '1px solid var(--accent-emerald)' : '1px solid var(--border-glass)',
                    color: selectedTier === t ? '#080c14' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 280 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search company or topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Company Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {filteredCompanies.map(comp => {
              const isExpanded = expandedCompanyId === comp.id;
              return (
                <div
                  key={comp.id}
                  className="glass-panel"
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    padding: 24,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  {/* Top Bar */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    cursor: 'pointer',
                  }} onClick={() => setExpandedCompanyId(isExpanded ? null : comp.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <img
                        src={comp.logo}
                        alt={comp.name}
                        style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', objectFit: 'cover', background: '#1e293b' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
                            {comp.name}
                          </h3>
                          <span className={`badge ${comp.tier.includes('Dream') ? 'badge-emerald' : 'badge-cyan'}`}>
                            {comp.tier}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700 }}>
                          ðŸ’° {comp.packageLPA}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {canManageCompanies && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEditCompany(comp);
                            }}
                          >
                            Edit
                          </button>
                          <DeleteButton
                            label="Remove"
                            onDelete={() => removeCompany(comp.id)}
                          />
                        </>
                      )}
                      {comp.driveLink && comp.driveLink !== '#' && (
                        <a
                          href={comp.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="btn btn-primary btn-sm"
                        >
                          <ExternalLink size={14} /> Prep Drive
                        </a>
                      )}

                      <button
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          padding: 8,
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Breakdown */}
                  {isExpanded && (
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
                      <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: 20 }}>
                        {comp.overview}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
                        {/* Hiring Process Rounds */}
                        <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#818cf8', marginBottom: 12, textTransform: 'uppercase' }}>
                            ðŸ“‹ Hiring Process & Rounds:
                          </h4>
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {comp.hiringRounds.map((r, idx) => (
                              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {idx + 1}
                                </span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* High Weightage Focus Topics */}
                        <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', marginBottom: 12, textTransform: 'uppercase' }}>
                            ðŸŽ¯ High Weightage Topics:
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {comp.importantTopics.map((t, idx) => (
                              <span key={idx} className="badge badge-cyan" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                                <CheckCircle2 size={12} /> {t}
                              </span>
                            ))}
                          </div>
                          <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Eligible Branches: <strong>{comp.eligibleBranches.join(', ')}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Real Student Interview Experience Archive */}
                      {comp.recentInterviewExperiences.length > 0 && (
                        <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a5b4fc', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Sparkles size={14} /> Senior Interview Experience Archive ({comp.recentInterviewExperiences[0].studentName}):
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: 8 }}>
                            <strong>Rounds Breakdown:</strong> {comp.recentInterviewExperiences[0].roundDetails}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#34d399', lineHeight: 1.5 }}>
                            <strong>Pro-Tip:</strong> {comp.recentInterviewExperiences[0].tips}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PREPARATION TRACKS & SHEETS */}
      {/* ========================================================================= */}
      {activeTab === 'tracks' && (
        <div className="animate-fade-in">
          {/* Header Bar with Add Button */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
                Curated Problem Sheets & Preparation Tracks
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Comprehensive DSA roadmaps, core CS theory guides, system design primers, and aptitude preparation links.
              </p>
            </div>

            {canManageCompanies && (
              <button className="btn btn-primary" onClick={handleOpenAddTrack}>
                <PlusCircle size={16} /> Add Preparation Track
              </button>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
          }}>
            {prepTracks.map((track) => (
              <div
                key={track.id}
                className="glass-panel"
                style={{
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="badge badge-indigo">{track.category}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${track.badgeClass}`}>{track.badge}</span>
                      {canManageCompanies && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleOpenEditTrack(track)}
                          >
                            Edit
                          </button>
                          <DeleteButton
                            label="Remove"
                            onDelete={() => handleRemoveTrack(track.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: 12, lineHeight: 1.35 }}>
                    {track.title}
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      Key Modules Covered:
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {track.topics.map((t, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={13} color="#818cf8" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 16,
                  borderTop: '1px solid var(--border-glass)',
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ⏱️ {track.hours} study plan
                  </span>
                  <a
                    href={track.link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-glow-cyan btn-sm"
                  >
                    <ExternalLink size={14} /> Open Problem Sheet
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLACEMENT STATISTICS */}
      {/* ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="animate-fade-in">
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--heading-blue)', marginBottom: 0 }}>
              Campus Placement Highlights (2025-26 Season)
            </h2>
            {canManageCompanies && <button className="btn btn-secondary btn-sm" onClick={() => { setStatsDraft(placementStats); setIsEditStatsOpen(true); }}>Edit statistics</button>}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginBottom: 32,
            }}>
              <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>{placementStats.highestCtc}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highest Campus Package</div>
              </div>

              <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--heading-blue)' }}>{placementStats.averageCtc}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall Campus Average CTC</div>
              </div>

              <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--heading-blue)' }}>{placementStats.placementRate}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CSE / IT Placement Rate</div>
              </div>

              <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--heading-blue)' }}>{placementStats.companiesVisited}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Companies Visited Campus</div>
              </div>

              <div style={{ background: 'rgba(8, 12, 20, 0.6)', padding: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--heading-blue)' }}>{placementStats.dreamOffers}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dream Packages (&gt;20 LPA)</div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--subtitle-blue)', lineHeight: 1.6 }}>
              💡 <strong>Training & Placement Cell Note:</strong> {placementStats.note}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isEditStatsOpen} onClose={() => setIsEditStatsOpen(false)} title="Edit placement statistics" subtitle="Update the figures shown to all students.">
        <form onSubmit={event => {
          event.preventDefault();
          setPlacementStats(statsDraft);
          localStorage.setItem('skillbridge_placement_stats_v1', JSON.stringify(statsDraft));
          setIsEditStatsOpen(false);
        }}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Highest Campus CTC</label><input className="form-control" value={statsDraft.highestCtc} onChange={event => setStatsDraft({ ...statsDraft, highestCtc: event.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Average CTC</label><input className="form-control" value={statsDraft.averageCtc} onChange={event => setStatsDraft({ ...statsDraft, averageCtc: event.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Placement rate</label><input className="form-control" value={statsDraft.placementRate} onChange={event => setStatsDraft({ ...statsDraft, placementRate: event.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Companies visited</label><input className="form-control" value={statsDraft.companiesVisited} onChange={event => setStatsDraft({ ...statsDraft, companiesVisited: event.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Dream offers</label><input className="form-control" value={statsDraft.dreamOffers} onChange={event => setStatsDraft({ ...statsDraft, dreamOffers: event.target.value })} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Placement cell note</label><textarea className="form-control" value={statsDraft.note} onChange={event => setStatsDraft({ ...statsDraft, note: event.target.value })} required /></div>
          <button className="btn btn-primary" type="submit"><TrendingUp size={16} /> Save statistics</button>
        </form>
      </Modal>

      {/* Add Company Modal */}
      <Modal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        title="Add Placement Company Card"
        subtitle="Publish a recruitment drive card with tier, package, rounds, required skills, and preparation resources."
      >
        <form onSubmit={handleCreateCompanySubmit}>
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input
              className="form-control"
              required
              placeholder="e.g. Google, Microsoft, Amazon, TCS Ninja"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Placement Tier</label>
              <select
                className="form-control"
                value={companyTier}
                onChange={e => setCompanyTier(e.target.value as CompanyPlacementInfo['tier'])}
              >
                <option value="Dream (20+ LPA)">Dream (20+ LPA)</option>
                <option value="Super Dream (12-20 LPA)">Super Dream (12-20 LPA)</option>
                <option value="Standard (6-12 LPA)">Standard (6-12 LPA)</option>
                <option value="Mass / Service (3.5-6 LPA)">Mass / Service (3.5-6 LPA)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Package (CTC) *</label>
              <input
                className="form-control"
                required
                placeholder="e.g. 14 LPA, 45 LPA"
                value={companyPackage}
                onChange={e => setCompanyPackage(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Eligible Branches (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Computer Science & Engg, Information Technology, Electronics"
              value={companyEligibleBranches}
              onChange={e => setCompanyEligibleBranches(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hiring Process & Rounds (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Online Test, Technical Round 1, Technical Round 2, HR Round"
              value={companyHiringRounds}
              onChange={e => setCompanyHiringRounds(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills & Important Topics (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Data Structures, C++, System Design, SQL"
              value={companyRequiredSkills}
              onChange={e => setCompanyRequiredSkills(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Drive / Prep Link (URL)</label>
              <input
                className="form-control"
                type="url"
                placeholder="https://drive.google.com/..."
                value={companyDriveLink}
                onChange={e => setCompanyDriveLink(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Logo URL</label>
              <input
                className="form-control"
                type="url"
                placeholder="https://..."
                value={companyLogo}
                onChange={e => setCompanyLogo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company Overview</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Brief overview of company, job roles, expectations, and placement drive context..."
              value={companyOverview}
              onChange={e => setCompanyOverview(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
            <Building size={16} /> Publish Company Card
          </button>
        </form>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditCompanyOpen}
        onClose={() => {
          setIsEditCompanyOpen(false);
          setEditingCompanyId(null);
        }}
        title="Edit Placement Company Details"
        subtitle="Update placement tier, package CTC, hiring rounds, required skills, and preparation link."
      >
        <form onSubmit={handleSaveEditCompany}>
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input
              className="form-control"
              required
              placeholder="e.g. Google, Microsoft, Amazon"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Placement Tier</label>
              <select
                className="form-control"
                value={companyTier}
                onChange={e => setCompanyTier(e.target.value as CompanyPlacementInfo['tier'])}
              >
                <option value="Dream (20+ LPA)">Dream (20+ LPA)</option>
                <option value="Super Dream (12-20 LPA)">Super Dream (12-20 LPA)</option>
                <option value="Standard (6-12 LPA)">Standard (6-12 LPA)</option>
                <option value="Mass / Service (3.5-6 LPA)">Mass / Service (3.5-6 LPA)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Package (CTC) *</label>
              <input
                className="form-control"
                required
                placeholder="e.g. 14 LPA, 45 LPA"
                value={companyPackage}
                onChange={e => setCompanyPackage(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Eligible Branches (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Computer Science & Engg, Information Technology, Electronics"
              value={companyEligibleBranches}
              onChange={e => setCompanyEligibleBranches(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hiring Process & Rounds (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Online Test, Technical Round 1, Technical Round 2, HR Round"
              value={companyHiringRounds}
              onChange={e => setCompanyHiringRounds(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Required Skills & Important Topics (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Data Structures, C++, System Design, SQL"
              value={companyRequiredSkills}
              onChange={e => setCompanyRequiredSkills(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Drive / Prep Link (URL)</label>
              <input
                className="form-control"
                type="url"
                placeholder="https://drive.google.com/..."
                value={companyDriveLink}
                onChange={e => setCompanyDriveLink(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Logo URL</label>
              <input
                className="form-control"
                type="url"
                placeholder="https://..."
                value={companyLogo}
                onChange={e => setCompanyLogo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company Overview</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Brief overview of company, job roles, expectations, and placement drive context..."
              value={companyOverview}
              onChange={e => setCompanyOverview(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
            <Building size={16} /> Save Company Changes
          </button>
        </form>
      </Modal>

      {/* Add Preparation Track Modal */}
      <Modal
        isOpen={isAddTrackOpen}
        onClose={() => setIsAddTrackOpen(false)}
        title="Add Preparation Track / Sheet"
        subtitle="Publish a new problem sheet or study track for students."
      >
        <form onSubmit={handleCreateTrackSubmit}>
          <div className="form-group">
            <label className="form-label">Track / Sheet Title *</label>
            <input
              className="form-control"
              required
              placeholder="e.g. Striver A2Z DSA Sheet, Blind 75 Must-Do"
              value={trackTitle}
              onChange={e => setTrackTitle(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                className="form-control"
                placeholder="e.g. Coding Assessments, Technical Rounds, System Design"
                value={trackCategory}
                onChange={e => setTrackCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Hours / Duration</label>
              <input
                className="form-control"
                placeholder="e.g. 50 Hours"
                value={trackHours}
                onChange={e => setTrackHours(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Key Modules Covered (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Arrays & Hashing, Binary Trees, Graphs, Dynamic Programming"
              value={trackTopics}
              onChange={e => setTrackTopics(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Resource / Sheet Link (URL) *</label>
              <input
                className="form-control"
                type="url"
                required
                placeholder="https://leetcode.com/... or https://geeksforgeeks.org/..."
                value={trackLink}
                onChange={e => setTrackLink(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Badge Label</label>
              <input
                className="form-control"
                placeholder="e.g. Mandatory, High Yield, Tier-1 Essential"
                value={trackBadge}
                onChange={e => setTrackBadge(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Badge Style</label>
            <select
              className="form-control"
              value={trackBadgeClass}
              onChange={e => setTrackBadgeClass(e.target.value)}
            >
              <option value="badge-emerald">Emerald (Green - Essential)</option>
              <option value="badge-indigo">Indigo (Purple - Mandatory)</option>
              <option value="badge-senior">Senior (Gold - Dream Focus)</option>
              <option value="badge-amber">Amber (Orange - Screening)</option>
              <option value="badge-cyan">Cyan (Blue - General)</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
            <PlusCircle size={16} /> Publish Preparation Track
          </button>
        </form>
      </Modal>

      {/* Edit Preparation Track Modal */}
      <Modal
        isOpen={isEditTrackOpen}
        onClose={() => {
          setIsEditTrackOpen(false);
          setEditingTrackId(null);
        }}
        title="Edit Preparation Track"
        subtitle="Update title, modules, hours, link, or badge style of this track."
      >
        <form onSubmit={handleSaveEditTrack}>
          <div className="form-group">
            <label className="form-label">Track / Sheet Title *</label>
            <input
              className="form-control"
              required
              placeholder="e.g. Striver A2Z DSA Sheet"
              value={trackTitle}
              onChange={e => setTrackTitle(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                className="form-control"
                placeholder="e.g. Coding Assessments"
                value={trackCategory}
                onChange={e => setTrackCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Hours / Duration</label>
              <input
                className="form-control"
                placeholder="e.g. 50 Hours"
                value={trackHours}
                onChange={e => setTrackHours(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Key Modules Covered (comma separated)</label>
            <input
              className="form-control"
              placeholder="e.g. Arrays & Hashing, Binary Trees, Graphs"
              value={trackTopics}
              onChange={e => setTrackTopics(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Resource / Sheet Link (URL) *</label>
              <input
                className="form-control"
                type="url"
                required
                placeholder="https://..."
                value={trackLink}
                onChange={e => setTrackLink(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Badge Label</label>
              <input
                className="form-control"
                placeholder="e.g. Mandatory"
                value={trackBadge}
                onChange={e => setTrackBadge(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Badge Style</label>
            <select
              className="form-control"
              value={trackBadgeClass}
              onChange={e => setTrackBadgeClass(e.target.value)}
            >
              <option value="badge-emerald">Emerald (Green - Essential)</option>
              <option value="badge-indigo">Indigo (Purple - Mandatory)</option>
              <option value="badge-senior">Senior (Gold - Dream Focus)</option>
              <option value="badge-amber">Amber (Orange - Screening)</option>
              <option value="badge-cyan">Cyan (Blue - General)</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
            <Target size={16} /> Save Track Changes
          </button>
        </form>
      </Modal>
    </div>
  );
};
