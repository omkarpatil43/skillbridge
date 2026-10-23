import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';
import { AcademicMaterial, SkillResource, UserRole } from '../types';
import {
  BookOpen,
  Sparkles,
  Search,
  PlusCircle,
  ExternalLink,
  Download,
  FileText,
  Video,
  FolderArchive,
  Code,
  ShieldCheck,
  Star,
  Clock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BranchPageProps {
  onToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const BranchPage: React.FC<BranchPageProps> = ({ onToast }) => {
  const { currentUser } = useAuth();
  const {
    academicMaterials,
    addAcademicMaterial,
    removeAcademicMaterial,
    incrementDownload,
    skillResources,
    addSkillResource,
    removeSkillResource,
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'academic' | 'skills'>('academic');

  // Academic filters
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedSem, setSelectedSem] = useState<number | 'All'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [academicSearch, setAcademicSearch] = useState<string>('');

  // Skills filters
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('All');
  const [selectedSkillType, setSelectedSkillType] = useState<string>('All');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('All');
  const [skillsSearch, setSkillsSearch] = useState<string>('');

  // Modal States
  const [isAddAcademicModalOpen, setIsAddAcademicModalOpen] = useState(false);
  const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);

  // New Academic Form State
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatBranch, setNewMatBranch] = useState('Computer Science & Engg');
  const [newMatSem, setNewMatSem] = useState(3);
  const [newMatSubject, setNewMatSubject] = useState('');
  const [newMatType, setNewMatType] = useState<AcademicMaterial['type']>('drive');
  const [newMatLink, setNewMatLink] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [newMatTags, setNewMatTags] = useState('');

  // New Skill Form State
  const [newSkillTitle, setNewSkillTitle] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillResource['category']>('Web Dev');
  const [newSkillType, setNewSkillType] = useState<SkillResource['type']>('video');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillResource['level']>('Beginner');
  const [newSkillDuration, setNewSkillDuration] = useState('8 Weeks');
  const [newSkillLink, setNewSkillLink] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillTags, setNewSkillTags] = useState('');

  // Dynamic Branches & Domains state
  const [branchesList, setBranchesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('skillbridge_custom_branches_v2');
    return saved ? JSON.parse(saved) : [
      'All',
      'Computer Science & Engg',
      'Information Technology',
      'Electronics & Communication',
      'Artificial Intelligence & Data Science',
      'Mechanical Engineering',
      'Civil Engineering',
      'Electrical & Electronics',
      'Common / All Branches',
    ];
  });

  const [skillCategories, setSkillCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('skillbridge_custom_domains_v2');
    return saved ? JSON.parse(saved) : [
      'All',
      'Web Dev',
      'AI & ML',
      'Cloud & DevOps',
      'Cybersecurity',
      'App Dev',
      'Data Science',
      'Core Engineering',
    ];
  });

  // Modal states for adding branch / domain
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newBranchInput, setNewBranchInput] = useState('');

  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBranchInput.trim();
    if (!trimmed) {
      onToast('Branch Name Required', 'Please enter a valid branch name.', 'error');
      return;
    }
    if (branchesList.includes(trimmed)) {
      onToast('Branch Exists', 'This branch is already listed.', 'info');
      setIsAddBranchModalOpen(false);
      setSelectedBranch(trimmed);
      return;
    }
    const updated = [...branchesList, trimmed];
    setBranchesList(updated);
    localStorage.setItem('skillbridge_custom_branches_v2', JSON.stringify(updated));
    setSelectedBranch(trimmed);
    setNewBranchInput('');
    setIsAddBranchModalOpen(false);
    confetti({ particleCount: 50, spread: 60 });
    onToast('Branch Added!', `New department "${trimmed}" is now active in Branch Hub.`, 'success');
  };

  const handleAddDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDomainInput.trim();
    if (!trimmed) {
      onToast('Domain Name Required', 'Please enter a valid skill domain / track name.', 'error');
      return;
    }
    if (skillCategories.includes(trimmed)) {
      onToast('Domain Exists', 'This skill domain is already listed.', 'info');
      setIsAddDomainModalOpen(false);
      setSelectedSkillCategory(trimmed);
      return;
    }
    const updated = [...skillCategories, trimmed];
    setSkillCategories(updated);
    localStorage.setItem('skillbridge_custom_domains_v2', JSON.stringify(updated));
    setSelectedSkillCategory(trimmed);
    setNewDomainInput('');
    setIsAddDomainModalOpen(false);
    confetti({ particleCount: 50, spread: 60 });
    onToast('Domain Added!', `New skill track "${trimmed}" added to Industry Skill Roadmaps.`, 'success');
  };

  const isVerifiedSeniorOrAdmin = Boolean(
    currentUser && (
      ['college_admin', 'admin'].includes(currentUser.role) ||
      (currentUser.role === 'senior' && currentUser.verificationStatus === 'Verified')
    )
  );
  const isPendingSenior = Boolean(currentUser && currentUser.role === 'senior' && currentUser.verificationStatus !== 'Verified');
  const canUpload = isVerifiedSeniorOrAdmin;

  const canDeleteContent = (_authorRole?: UserRole) => {
    if (!currentUser) return false;
    if (['college_admin', 'admin'].includes(currentUser.role)) return true;
    if (currentUser.role === 'senior' && currentUser.verificationStatus === 'Verified') return true;
    return false;
  };

  // Filter Academic Materials
  const filteredAcademic = academicMaterials.filter(mat => {
    const matchBranch = selectedBranch === 'All' || mat.branch === selectedBranch || mat.branch === 'Common / All Branches';
    const matchSem = selectedSem === 'All' || mat.semester === selectedSem;
    const matchType = selectedType === 'All' || mat.type === selectedType;
    const matchSearch =
      mat.title.toLowerCase().includes(academicSearch.toLowerCase()) ||
      mat.subject.toLowerCase().includes(academicSearch.toLowerCase()) ||
      mat.tags.some(t => t.toLowerCase().includes(academicSearch.toLowerCase()));
    return matchBranch && matchSem && matchType && matchSearch;
  });

  // Filter Skill Resources
  const filteredSkills = skillResources.filter(sk => {
    const matchCat = selectedSkillCategory === 'All' || sk.category === selectedSkillCategory;
    const matchType = selectedSkillType === 'All' || sk.type === selectedSkillType;
    const matchLevel = selectedSkillLevel === 'All' || sk.level === selectedSkillLevel;
    const matchSearch =
      sk.title.toLowerCase().includes(skillsSearch.toLowerCase()) ||
      sk.description.toLowerCase().includes(skillsSearch.toLowerCase()) ||
      sk.tags.some(t => t.toLowerCase().includes(skillsSearch.toLowerCase()));
    return matchCat && matchType && matchLevel && matchSearch;
  });

  // Handle Add Academic Material Submit
  const handleAddAcademic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatTitle || !newMatLink || !newMatSubject) {
      onToast('Missing Information', 'Please fill in Title, Subject, and Link.', 'error');
      return;
    }

    addAcademicMaterial({
      title: newMatTitle,
      branch: newMatBranch,
      semester: Number(newMatSem),
      subject: newMatSubject,
      type: newMatType,
      link: newMatLink,
      description: newMatDesc || 'Verified academic resource uploaded for student community.',
      authorName: currentUser?.name || 'Senior Mentor',
      authorRole: currentUser?.role || 'senior',
      authorRollNo: currentUser?.rollNo,
      tags: newMatTags ? newMatTags.split(',').map(t => t.trim()) : [newMatSubject, `Sem ${newMatSem}`],
    });

    confetti({ particleCount: 60, spread: 60 });
    onToast('Material Published!', 'Your academic resource is now visible to all students.', 'success');
    setIsAddAcademicModalOpen(false);

    // Reset Form
    setNewMatTitle('');
    setNewMatSubject('');
    setNewMatLink('');
    setNewMatDesc('');
    setNewMatTags('');
  };

  // Handle Add Skill Submit
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillTitle || !newSkillLink) {
      onToast('Missing Fields', 'Please provide title and resource link.', 'error');
      return;
    }

    addSkillResource({
      title: newSkillTitle,
      category: newSkillCategory,
      type: newSkillType,
      level: newSkillLevel,
      duration: newSkillDuration,
      link: newSkillLink,
      description: newSkillDesc || 'Curated high-impact industry skill resource.',
      authorName: currentUser?.name || 'Senior Mentor',
      authorRole: currentUser?.role || 'senior',
      tags: newSkillTags ? newSkillTags.split(',').map(t => t.trim()) : [newSkillCategory, newSkillLevel],
    });

    confetti({ particleCount: 60, spread: 60 });
    onToast('Skill Resource Shared!', 'New learning resource has been added for everyone.', 'success');
    setIsAddSkillModalOpen(false);

    // Reset Form
    setNewSkillTitle('');
    setNewSkillLink('');
    setNewSkillDesc('');
    setNewSkillTags('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'drive': return <FolderArchive size={16} />;
      case 'pdf':
      case 'notes':
      case 'pyq': return <FileText size={16} />;
      case 'video': return <Video size={16} />;
      case 'repo': return <Code size={16} />;
      default: return <ExternalLink size={16} />;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header Banner */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-eyebrow"><BookOpen size={14} /> Branch Learning Hub</div>
            <h1 className="page-title">Academic Notes & Industry Skills</h1>
            <p className="page-subtitle">
              Choose between college subject notes / Google Drive links or industry skill roadmaps (Web Dev, AI/ML, Cloud).
            </p>
          </div>
          <div>
            {canUpload ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (activeSubTab === 'academic') setIsAddAcademicModalOpen(true);
                    else setIsAddSkillModalOpen(true);
                  }}
                  className="btn btn-primary"
                >
                  <PlusCircle size={18} />
                  {activeSubTab === 'academic' ? 'Add Material' : 'Add Skill Resource'}
                </button>

                {activeSubTab === 'academic' ? (
                  <button
                    onClick={() => setIsAddBranchModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <PlusCircle size={16} /> Add Branch
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddDomainModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <PlusCircle size={16} /> Add Domain
                  </button>
                )}
              </div>
            ) : isPendingSenior ? (
              <div className="info-banner" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(2, 132, 199, 0.08)', borderColor: 'var(--sky-200)' }}>
                <Clock size={16} color="#0284c7" />
                <span>Senior Mentor profile <strong>Pending Admin Verification</strong>. ID card under review.</span>
              </div>
            ) : (
              <div className="info-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} />
                <span>Verified <strong>Seniors & Admins</strong> can upload and manage resources</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar (Academic vs Skills) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <button
          onClick={() => setActiveSubTab('academic')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            background: activeSubTab === 'academic' ? 'var(--sky-50)' : 'var(--bg-secondary)',
            border: `2px solid ${activeSubTab === 'academic' ? 'var(--sky-500)' : 'var(--sky-200)'}`,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: activeSubTab === 'academic' ? 'var(--sky-500)' : 'var(--sky-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeSubTab === 'academic' ? '#fff' : 'var(--sky-600)',
          }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              1. Academic Study Materials ({academicMaterials.length})
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Google Drive links, solved PYQ exam papers, handwritten notes & syllabus
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('skills')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            background: activeSubTab === 'skills' ? 'var(--sky-50)' : 'var(--bg-secondary)',
            border: `2px solid ${activeSubTab === 'skills' ? 'var(--sky-500)' : 'var(--sky-200)'}`,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: activeSubTab === 'skills' ? 'var(--sky-500)' : 'var(--sky-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeSubTab === 'skills' ? '#fff' : 'var(--sky-600)',
          }}>
            <Code size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              2. Industry Skill Roadmaps ({skillResources.length})
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Fullstack, AI/ML, DevOps, DSA sheets, GitHub repos & project guides
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ACADEMIC MATERIALS */}
      {/* ========================================================================= */}
      {activeSubTab === 'academic' && (
        <div className="animate-fade-in">
          {/* Academic Filter Bar */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Helper text */}
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} color="var(--accent-primary)" />
              <span><strong>Quick Filter:</strong> Select your Branch and Semester below to find notes instantly:</span>
            </div>

            {/* Branch Pills Filter */}
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {branchesList.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-full)',
                      background: selectedBranch === b ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      border: selectedBranch === b ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      color: selectedBranch === b ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Semester + Type Filters */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
            }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by subject or note title..."
                  value={academicSearch}
                  onChange={e => setAcademicSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)' }} />
              </div>

              {/* Semester Selector */}
              <div>
                <select
                  className="form-control"
                  value={selectedSem}
                  onChange={e => setSelectedSem(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                >
                  <option value="All">All Semesters (1 to 8)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              {/* Type Selector */}
              <div>
                <select
                  className="form-control"
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                >
                  <option value="All">All Material Types</option>
                  <option value="drive">ðŸ“ Google Drive Folders</option>
                  <option value="notes">ðŸ“ Handwritten Class Notes</option>
                  <option value="pyq">ðŸ“‘ Solved PYQ Exam Papers</option>
                  <option value="pdf">ðŸ“• Reference Books & PDFs</option>
                  <option value="video">ðŸŽ¥ Curated Video Lectures</option>
                  <option value="lab">ðŸ”¬ Lab Manuals & Codes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}>
            {filteredAcademic.map(mat => (
              <div
                key={mat.id}
                className="glass-panel"
                style={{
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-indigo">
                        {getTypeIcon(mat.type)} {mat.type === 'drive' ? 'Google Drive' : mat.type.toUpperCase()}
                      </span>
                      <span className="badge badge-cyan">
                        Sem {mat.semester}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Download size={13} /> {mat.downloadsCount} accesses
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4 }}>
                    {mat.subject}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 10 }}>
                    {mat.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                    {mat.description}
                  </p>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {mat.tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-glass)',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Author & Action Link */}
                <div className="card-actions">
                  <div style={{ fontSize: '0.78rem', color: 'var(--sky-600)' }}>
                    <div>Uploaded by: <strong style={{ color: 'var(--sky-900)' }}>{mat.authorName.split(' ')[0]}</strong></div>
                    <div style={{ fontSize: '0.7rem' }}>{mat.dateAdded}</div>
                  </div>
                  <div className="card-actions-end">
                    {canDeleteContent(mat.authorRole) && (
                      <DeleteButton
                        label="Remove Material"
                        onDelete={() => {
                          removeAcademicMaterial(mat.id);
                          onToast('Material Removed', 'Academic resource has been deleted.', 'info');
                        }}
                      />
                    )}
                    <a
                      href={mat.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => incrementDownload(mat.id)}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> Open {mat.type === 'drive' ? 'Drive' : 'Material'}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAcademic.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-glass)',
            }}>
              <BookOpen size={40} color="var(--sky-400)" style={{ marginBottom: 12 }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: 6 }}>No Notes Found For This Selection</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Try selecting "All Semesters" or switch to another branch!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SKILLS TRACKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'skills' && (
        <div className="animate-fade-in">
          {/* Skills Filter Bar */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Category Pills */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} /> Select Career & Skill Domain:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skillCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedSkillCategory(cat)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-full)',
                      background: selectedSkillCategory === cat ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      border: selectedSkillCategory === cat ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      color: selectedSkillCategory === cat ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search skill (e.g. React, PyTorch, Docker)..."
                  value={skillsSearch}
                  onChange={e => setSkillsSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)' }} />
              </div>

              <div>
                <select
                  className="form-control"
                  value={selectedSkillLevel}
                  onChange={e => setSelectedSkillLevel(e.target.value)}
                >
                  <option value="All">All Difficulty Levels</option>
                  <option value="Beginner">ðŸŸ¢ Beginner (Start Here)</option>
                  <option value="Intermediate">ðŸŸ¡ Intermediate</option>
                  <option value="Advanced">ðŸ”´ Advanced (Placement Level)</option>
                </select>
              </div>

              <div>
                <select
                  className="form-control"
                  value={selectedSkillType}
                  onChange={e => setSelectedSkillType(e.target.value)}
                >
                  <option value="All">All Formats</option>
                  <option value="video">ðŸŽ¥ Video Courses</option>
                  <option value="roadmap">ðŸ—ºï¸ Step-by-Step Roadmaps</option>
                  <option value="drive">ðŸ“ Google Drive Colab / Docs</option>
                  <option value="pdf">ðŸ“• PDF Cheatsheet</option>
                  <option value="repo">ðŸ’» GitHub Repositories</option>
                </select>
              </div>
            </div>
          </div>

          {/* Skills Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 20,
          }}>
            {filteredSkills.map(sk => (
              <div
                key={sk.id}
                className="glass-panel"
                style={{
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="badge">{sk.category}</span>
                    <span className="badge">{sk.level}</span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {sk.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                    {sk.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    {sk.duration && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} /> {sk.duration}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={14} /> {sk.rating.toFixed(1)} / 5.0
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {sk.tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(2, 132, 199, 0.08)',
                          color: '#0284c7',
                          border: '1px solid rgba(2, 132, 199, 0.2)',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-glass)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Curated by <strong style={{ color: 'var(--text-primary)' }}>{sk.authorName}</strong>
                  </span>

                  <div className="card-actions-end">
                    {canDeleteContent(sk.authorRole) && (
                      <DeleteButton label="Remove" onDelete={() => removeSkillResource(sk.id)} />
                    )}
                    <a
                      href={sk.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-glow-cyan btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> Start Learning
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPLOAD ACADEMIC MATERIAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddAcademicModalOpen}
        onClose={() => setIsAddAcademicModalOpen(false)}
        title="Upload Academic Study Material"
        subtitle="Share Google Drive links, PYQ solutions, or notes with the student community"
      >
        <form onSubmit={handleAddAcademic}>
          <div className="form-group">
            <label className="form-label">Material Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Operating Systems Solved PYQs (2020-2025)"
              value={newMatTitle}
              onChange={e => setNewMatTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <select
                className="form-control"
                value={newMatBranch}
                onChange={e => setNewMatBranch(e.target.value)}
              >
                {branchesList.filter(b => b !== 'All').map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Semester</label>
              <select
                className="form-control"
                value={newMatSem}
                onChange={e => setNewMatSem(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Subject Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Data Structures & Algorithms"
                value={newMatSubject}
                onChange={e => setNewMatSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Resource Type</label>
              <select
                className="form-control"
                value={newMatType}
                onChange={e => setNewMatType(e.target.value as AcademicMaterial['type'])}
              >
                <option value="drive">ðŸ“ Google Drive Folder</option>
                <option value="notes">ðŸ“ Handwritten Class Notes</option>
                <option value="pyq">ðŸ“‘ Solved PYQ Collection</option>
                <option value="pdf">ðŸ“• Textbook / PDF Reference</option>
                <option value="video">ðŸŽ¥ Curated Video Playlist</option>
                <option value="lab">ðŸ”¬ Lab Manual / Code</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Google Drive / Resource Link</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://drive.google.com/drive/folders/..."
              value={newMatLink}
              onChange={e => setNewMatLink(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Topics Covered</label>
            <textarea
              className="form-control"
              placeholder="Brief summary of what this document covers..."
              value={newMatDesc}
              onChange={e => setNewMatDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Trees, DP, MidSem, Solved"
              value={newMatTags}
              onChange={e => setNewMatTags(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
            Publish to Campus Drive Hub
          </button>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: SHARE SKILL RESOURCE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddSkillModalOpen}
        onClose={() => setIsAddSkillModalOpen(false)}
        title="Share Industry Skill Track"
        subtitle="Add roadmaps, video playlists, or GitHub repositories for campus learners"
      >
        <form onSubmit={handleAddSkill}>
          <div className="form-group">
            <label className="form-label">Skill Resource Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Full Stack MERN Master Roadmap 2026"
              value={newSkillTitle}
              onChange={e => setNewSkillTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={newSkillCategory}
                onChange={e => setNewSkillCategory(e.target.value as SkillResource['category'])}
              >
                {skillCategories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resource Format</label>
              <select
                className="form-control"
                value={newSkillType}
                onChange={e => setNewSkillType(e.target.value as SkillResource['type'])}
              >
                <option value="video">ðŸŽ¥ Video Playlist</option>
                <option value="roadmap">ðŸ—ºï¸ Step-by-Step Roadmap</option>
                <option value="drive">ðŸ“ Google Drive Colab / Docs</option>
                <option value="pdf">ðŸ“• PDF Cheatsheet / Guide</option>
                <option value="repo">ðŸ’» GitHub Repo</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Proficiency Level</label>
              <select
                className="form-control"
                value={newSkillLevel}
                onChange={e => setNewSkillLevel(e.target.value as SkillResource['level'])}
              >
                <option value="Beginner">Beginner (0 to 1)</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced / Production</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Duration</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 10 Weeks"
                value={newSkillDuration}
                onChange={e => setNewSkillDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Resource URL / Link</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://roadmap.sh/..."
              value={newSkillLink}
              onChange={e => setNewSkillLink(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Brief Description</label>
            <textarea
              className="form-control"
              placeholder="Why is this resource valuable for campus placements/hackathons?"
              value={newSkillDesc}
              onChange={e => setNewSkillDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. React, Next.js, Web3, Colab"
              value={newSkillTags}
              onChange={e => setNewSkillTags(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-glow-cyan btn-lg" style={{ width: '100%', marginTop: 8 }}>
            Publish Skill Track
          </button>
        </form>
      </Modal>

      {/* Modal 3: Add New Branch */}
      <Modal
        isOpen={isAddBranchModalOpen}
        onClose={() => setIsAddBranchModalOpen(false)}
        title="Add New Academic Branch / Department"
        subtitle="Only Administrators and Verified Seniors can introduce new engineering branches."
      >
        <form onSubmit={handleAddBranchSubmit}>
          <div className="form-group">
            <label className="form-label">Department / Branch Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Robotics & Automation, Chemical Engineering"
              value={newBranchInput}
              onChange={e => setNewBranchInput(e.target.value)}
              required
              autoFocus
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Once added, this department will appear in the Branch Hub filters and material submission options.
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12 }}>
            <PlusCircle size={18} /> Add Branch to Hub
          </button>
        </form>
      </Modal>

      {/* Modal 4: Add New Skill Domain */}
      <Modal
        isOpen={isAddDomainModalOpen}
        onClose={() => setIsAddDomainModalOpen(false)}
        title="Add New Skill Domain / Learning Track"
        subtitle="Expand the industry skill roadmap categories available to students."
      >
        <form onSubmit={handleAddDomainSubmit}>
          <div className="form-group">
            <label className="form-label">Skill Domain / Track Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Blockchain & Web3, Quantum Computing, Game Dev"
              value={newDomainInput}
              onChange={e => setNewDomainInput(e.target.value)}
              required
              autoFocus
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
              This new domain will appear in the Industry Skill Roadmaps category filters.
            </div>
          </div>

          <button type="submit" className="btn btn-glow-cyan btn-lg" style={{ width: '100%', marginTop: 12 }}>
            <PlusCircle size={18} /> Add Skill Domain
          </button>
        </form>
      </Modal>
    </div>
  );
};

