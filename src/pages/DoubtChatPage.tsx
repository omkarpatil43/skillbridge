import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Modal } from '../components/Modal';
import {
  MessageSquareCode,
  ThumbsUp,
  MessageCircle,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Code,
  Search,
  Sparkles,
  Send,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DoubtChatPageProps {
  onToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const DoubtChatPage: React.FC<DoubtChatPageProps> = ({ onToast }) => {
  const { currentUser } = useAuth();
  const { doubts, postDoubt, replyToDoubt, verifyReply, upvoteDoubt, upvoteReply } = useData();

  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Solved' | 'Unsolved'>('All');
  const [expandedDoubtId, setExpandedDoubtId] = useState<string>(doubts[0]?.id || '');

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyCode, setReplyCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  // New Doubt Modal State
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBranch, setNewBranch] = useState('Computer Science & Engg');
  const [newDesc, setNewDesc] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTags, setNewTags] = useState('');

  const branches = [
    'All',
    'Computer Science & Engg',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical & Electronics',
  ];

  const filteredDoubts = doubts.filter(d => {
    const matchBranch = selectedBranch === 'All' || d.branch === selectedBranch;
    const matchStatus =
      statusFilter === 'All' ? true : statusFilter === 'Solved' ? d.solved : !d.solved;
    const matchSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchBranch && matchStatus && matchSearch;
  });

  const activeDoubt = doubts.find(d => d.id === expandedDoubtId) || filteredDoubts[0] || doubts[0];

  const handlePostDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim() || !newDesc.trim()) {
      onToast('Missing Fields', 'Title, Subject and Description are required.', 'error');
      return;
    }

    const created = postDoubt({
      title: newTitle,
      description: newDesc,
      codeSnippet: newCode || undefined,
      branch: newBranch,
      subject: newSubject,
      authorName: currentUser?.name || 'Student',
      authorRole: currentUser?.role || 'student',
      authorRollNo: currentUser?.rollNo || '24CS000',
      tags: newTags ? newTags.split(',').map(t => t.trim()) : ['General'],
    });

    confetti({ particleCount: 50, spread: 60 });
    onToast('Question Posted!', 'Your question is now visible to seniors and mentors.', 'success');
    setExpandedDoubtId(created.id);
    setIsAskModalOpen(false);

    // Reset
    setNewTitle('');
    setNewSubject('');
    setNewDesc('');
    setNewCode('');
    setNewTags('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoubt) return;
    if (!replyText.trim()) {
      onToast('Empty Answer', 'Please write your explanation.', 'error');
      return;
    }

    replyToDoubt(activeDoubt.id, {
      authorName: currentUser?.name || 'Peer Scholar',
      authorRole: currentUser?.role || 'student',
      authorRollNo: currentUser?.rollNo || '24CS000',
      content: replyText,
      codeSnippet: replyCode || undefined,
    });

    confetti({ particleCount: 40, spread: 50 });
    onToast('Solution Posted!', 'Thank you for helping fellow campus students.', 'success');
    setReplyText('');
    setReplyCode('');
    setShowCodeInput(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Header Banner */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--accent-rose)',
            marginBottom: 6,
          }}>
            <MessageSquareCode size={14} /> Peer Knowledge Exchange
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Senior-Fresher <span className="gradient-text">Doubt Chat</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 640, fontSize: '0.92rem' }}>
            Got stuck in assignments or coding? Ask questions with code blocks and get verified answers from senior mentors.
          </p>
        </div>

        <button
          onClick={() => setIsAskModalOpen(true)}
          className="btn btn-primary btn-lg"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <PlusCircle size={20} /> Ask a Question (+)
        </button>
      </div>

      {/* Helpful Instructions Card */}
      <div style={{
        background: 'rgba(79, 70, 229, 0.06)',
        border: '1px solid rgba(79, 70, 229, 0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#4f46e5" />
          <span><strong>How it works:</strong> Click any question on the left to read answers or write your solution below. Answers by Seniors show a verified <strong style={{ color: '#9333ea' }}>Senior Verified Badge</strong>!</span>
        </div>
      </div>

      {/* Main Layout: 2 Columns (Doubt List & Thread Detail) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 420px) 1fr',
        gap: 24,
        alignItems: 'start',
      }} className="doubt-layout">

        {/* Left Column: Doubts Sidebar & Filters */}
        <div>
          {/* Search & Status Filters */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            marginBottom: 16,
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search doubts or subjects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-muted)' }} />
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['All', 'Solved', 'Unsolved'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: statusFilter === st ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    border: 'none',
                    color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {st === 'Solved' ? 'âœ… Solved' : st === 'Unsolved' ? 'â³ Open' : 'All Questions'}
                </button>
              ))}
            </div>

            <select
              className="form-control"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '8px 12px' }}
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Doubt Question Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
            {filteredDoubts.map(d => {
              const isSelected = activeDoubt?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setExpandedDoubtId(d.id)}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'var(--bg-secondary)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {d.subject}
                    </span>
                    <span className={`badge ${d.solved ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                      {d.solved ? 'âœ… Solved' : 'â³ Open'}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 8 }}>
                    {d.title}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>By {d.authorName.split(' ')[0]} ({d.authorRollNo})</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ThumbsUp size={12} /> {d.upvotes}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MessageCircle size={12} /> {d.replies.length} answers
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Thread & Interactive Discussion */}
        <div>
          {activeDoubt ? (
            <div className="glass-panel" style={{ padding: 28, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
              {/* Question Header */}
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-indigo">{activeDoubt.branch}</span>
                    <span className="badge badge-cyan">{activeDoubt.subject}</span>
                    {activeDoubt.solved && (
                      <span className="badge badge-emerald">
                        <CheckCircle2 size={12} /> Senior Verified Solution
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Posted on {activeDoubt.date}
                  </div>
                </div>

                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 12 }}>
                  {activeDoubt.title}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                    {activeDoubt.authorName[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeDoubt.authorName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Roll No: {activeDoubt.authorRollNo} â€¢ {activeDoubt.authorRole.toUpperCase()}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  {activeDoubt.description}
                </p>

                {/* Code snippet if present */}
                {activeDoubt.codeSnippet && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Code size={14} /> Attached Code Snippet:
                    </div>
                    <pre className="code-preview">{activeDoubt.codeSnippet}</pre>
                  </div>
                )}

                {/* Tags & Upvote */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {activeDoubt.tags.map((t, idx) => (
                      <span key={idx} className="badge badge-indigo">#{t}</span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      upvoteDoubt(activeDoubt.id);
                      onToast('Upvoted!', 'Question upvoted for higher campus visibility.', 'info');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <ThumbsUp size={14} /> Upvote Question ({activeDoubt.upvotes})
                  </button>
                </div>
              </div>

              {/* Answers & Senior Solutions Section */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={18} color="#4f46e5" />
                  Solutions & Mentorship Replies ({activeDoubt.replies.length})
                </h3>

                {activeDoubt.replies.length === 0 ? (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-glass)',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                  }}>
                    No answers posted yet. Write your explanation below to help!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {activeDoubt.replies.map(rep => (
                      <div
                        key={rep.id}
                        style={{
                          padding: 18,
                          borderRadius: 'var(--radius-md)',
                          background: rep.isSeniorVerified ? 'rgba(124, 58, 237, 0.06)' : 'var(--bg-tertiary)',
                          border: `1px solid ${rep.isSeniorVerified ? 'rgba(124, 58, 237, 0.3)' : 'var(--border-glass)'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{rep.authorName}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({rep.authorRollNo})</span>
                            {rep.isSeniorVerified && (
                              <span className="badge badge-senior">
                                <ShieldCheck size={12} /> Senior Verified Answer
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rep.date}</span>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
                          {rep.content}
                        </p>

                        {rep.codeSnippet && (
                          <div style={{ marginBottom: 12 }}>
                            <pre className="code-preview">{rep.codeSnippet}</pre>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border-glass)' }}>
                          <button
                            onClick={() => {
                              upvoteReply(activeDoubt.id, rep.id);
                              onToast('Upvoted Solution!', '', 'info');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          >
                            <ThumbsUp size={12} /> Helpful ({rep.upvotes})
                          </button>

                          {!rep.isSeniorVerified && (currentUser?.role === 'senior' || currentUser?.role === 'college_admin') && (
                            <button
                              onClick={() => {
                                verifyReply(activeDoubt.id, rep.id);
                                confetti({ particleCount: 50 });
                                onToast('Verified by Senior!', 'Answer marked as official senior-verified solution.', 'success');
                              }}
                              className="btn btn-glow-cyan btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            >
                              <ShieldCheck size={12} /> Verify as Senior Mentor
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Write Your Answer / Explanation:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(!showCodeInput)}
                    style={{
                      background: showCodeInput ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-secondary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 6,
                      color: showCodeInput ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Code size={13} /> {showCodeInput ? 'Hide Code Block' : '+ Attach Code Block'}
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <textarea
                    className="form-control"
                    placeholder={
                      currentUser?.role === 'senior'
                        ? 'Explain the solution clearly step-by-step for the junior...'
                        : 'Share your solution or explanation...'
                    }
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    required
                  />
                </div>

                {showCodeInput && (
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Code Snippet (C++, Java, Python, JS, etc.)</label>
                    <textarea
                      className="form-control"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', minHeight: 80 }}
                      placeholder="// Paste code here..."
                      value={replyCode}
                      onChange={e => setReplyCode(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={14} /> Submit Solution
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-glass)',
            }}>
              <QuestionIcon size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>Select a Question from the Left</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Or click "Ask a Question (+)" to start a new discussion.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ASK A NEW QUESTION */}
      <Modal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        title="Ask Question to Seniors & Peers"
        subtitle="Get help with subject theory, numericals, assignments, or coding bugs"
      >
        <form onSubmit={handlePostDoubt}>
          <div className="form-group">
            <label className="form-label">Question Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. How does Dijkstra's Algorithm handle negative weight cycles?"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <select
                className="form-control"
                value={newBranch}
                onChange={e => setNewBranch(e.target.value)}
              >
                {branches.filter(b => b !== 'All').map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Data Structures / OS / DSP"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Explanation / Where you are stuck</label>
            <textarea
              className="form-control"
              placeholder="Provide background, what you tried, and specific parts you are confused about..."
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Code Snippet (Optional)</label>
            <textarea
              className="form-control"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', minHeight: 90 }}
              placeholder="// Paste relevant code snippet if applicable..."
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Algorithms, Graphs, MidSem, C++"
              value={newTags}
              onChange={e => setNewTags(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
            Post Question to Doubt Forum
          </button>
        </form>
      </Modal>

      <style>{`
        @media (max-width: 900px) {
          .doubt-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
