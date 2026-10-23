import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  MessageCircle, Send, Paperclip, FileText,
  Archive, X, Download, ShieldCheck, GraduationCap,
  Smile, Search, Star, Loader2
} from 'lucide-react';

// --- Types ------------------------------------------------------------------
type AttachmentType = 'image' | 'video' | 'pdf' | 'doc' | 'audio' | 'other';

interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  size: number;
  mimeType: string;
}

interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderYear: string;
  text: string;
  attachments: Attachment[];
  timestamp: Date;
  reactions: Record<string, string[]>;
  roomId: string;
}

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'general' | 'branch' | 'senior' | 'year';
}

const ROOMS: ChatRoom[] = [
  { id: 'general', name: 'General', description: 'Open campus talk — everyone welcome!', icon: '', type: 'general' },
  { id: 'seniors', name: 'Senior Lounge', description: 'Seniors & mentors space', icon: '', type: 'senior' },
  { id: 'cse', name: 'CSE Hub', description: 'Computer Science & Engineering', icon: '', type: 'branch' },
  { id: 'it', name: 'IT Hub', description: 'Information Technology', icon: '', type: 'branch' },
  { id: 'ece', name: 'E&C Hub', description: 'Electronics & Communication', icon: '', type: 'branch' },
  { id: 'mech', name: 'Mech Hub', description: 'Mechanical Engineering', icon: '', type: 'branch' },
  { id: 'fyr', name: '1st Year', description: 'Freshers connect here!', icon: '', type: 'year' },
  { id: 'syr', name: '2nd Year', description: 'Second year students', icon: '', type: 'year' },
  { id: 'tyr', name: '3rd Year', description: 'Third year students', icon: '', type: 'year' },
  { id: 'final', name: 'Final Year', description: 'Final year & placements', icon: '', type: 'year' },
];

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '😢', '👏'];
const ACCEPTED_EXTENSIONS = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.csv,.json,.py,.js,.ts,.cpp,.java,.c';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateHeader(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function RoleBadge({ role, year }: { role: string; year: string }) {
  if (role === 'college_admin' || role === 'admin') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
        borderRadius: 999, background: 'rgba(239,68,68,0.12)', color: '#dc2626',
        border: '1px solid rgba(239,68,68,0.25)',
      }}>
        <ShieldCheck size={10} /> Admin
      </span>
    );
  }
  const isSenior = role === 'senior' || role === 'club_admin' || year.includes('2nd') || year.includes('3rd') || year.includes('4th') || year.includes('Senior');
  if (isSenior) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
        borderRadius: 999, background: 'rgba(124,58,237,0.12)', color: '#7c3aed',
        border: '1px solid rgba(124,58,237,0.25)',
      }}>
        <Star size={10} /> Senior · {year}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
      borderRadius: 999, background: 'rgba(59,130,246,0.10)', color: '#2563eb',
      border: '1px solid rgba(59,130,246,0.2)',
    }}>
      <GraduationCap size={10} /> Junior · {year}
    </span>
  );
}

function AttachmentView({ att }: { att: Attachment }) {
  if (att.type === 'image') {
    return (
      <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', maxWidth: 300 }}>
        <img src={att.url} alt={att.name} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block', borderRadius: 10 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(0,0,0,0.04)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>{att.name}</span>
          <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', lineHeight: 1 }}><Download size={12} /></a>
        </div>
      </div>
    );
  }
  if (att.type === 'video') {
    return (
      <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', maxWidth: 360 }}>
        <video src={att.url} controls style={{ width: '100%', maxHeight: 220, borderRadius: 10, display: 'block', background: '#000' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(0,0,0,0.04)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>{att.name} · {formatFileSize(att.size)}</span>
          <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', lineHeight: 1 }}><Download size={12} /></a>
        </div>
      </div>
    );
  }
  if (att.type === 'audio') {
    return (
      <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,70,229,0.07)', border: '1px solid rgba(79,70,229,0.15)', maxWidth: 320 }}>
        <audio src={att.url} controls style={{ width: '100%', height: 36 }} />
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{att.name}</div>
      </div>
    );
  }
  if (att.type === 'pdf') {
    return (
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(229,62,62,0.06)', border: '1px solid rgba(229,62,62,0.2)', maxWidth: 320 }}>
        <div style={{ background: '#e53e3e', borderRadius: 8, padding: 8, color: '#fff', flexShrink: 0 }}><FileText size={20} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF · {formatFileSize(att.size)}</div>
        </div>
        <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', flexShrink: 0 }} title="Download"><Download size={16} /></a>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', maxWidth: 320 }}>
      <div style={{ background: 'var(--accent-primary)', borderRadius: 8, padding: 8, color: '#fff', flexShrink: 0 }}><Archive size={18} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatFileSize(att.size)}</div>
      </div>
      <a href={att.url} download={att.name} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', flexShrink: 0 }} title="Download"><Download size={16} /></a>
    </div>
  );
}

export const ChatPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>('general');
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineCount] = useState(38);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentRoom = ROOMS.find(r => r.id === activeRoom)!;

  const getUserYear = useCallback(() => {
    if (!currentUser) return '1st Year';
    if (currentUser.year) return currentUser.year;
    const level = currentUser.studentLevel;
    if (level === 'Fresher') return '1st Year (Fresher)';
    if (level === 'SecondYear') return '2nd Year (Senior)';
    if (level === 'ThirdYear') return '3rd Year (Senior)';
    if (level === 'FinalYear') return '4th Year (Senior)';
    if (level === 'Alumni') return 'Alumni';
    return '1st Year';
  }, [currentUser]);

  // Load messages from MongoDB API
  const fetchRoomMessages = useCallback(async (roomId: string) => {
    try {
      const data = await api.getRoomMessages(roomId);
      if (Array.isArray(data)) {
        const formatted: ChatMsg[] = data.map((m: any) => ({
          id: m.id || m._id,
          senderId: m.senderId || 'u-guest',
          senderName: m.senderName || 'Anonymous Student',
          senderRole: m.senderRole || 'student',
          senderYear: m.senderYear || '1st Year',
          text: m.text || '',
          attachments: m.attachments || [],
          timestamp: new Date(m.createdAt || m.timestamp || Date.now()),
          reactions: m.reactions || {},
          roomId: m.roomId || roomId,
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error('Failed to load room messages:', err);
    }
  }, []);

  // Sync on activeRoom change & poll every 3.5s
  useEffect(() => {
    fetchRoomMessages(activeRoom);
    const interval = setInterval(() => {
      fetchRoomMessages(activeRoom);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeRoom, fetchRoomMessages]);

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!text.trim() && pendingFiles.length === 0) return;
    if (sendingMsg) return;

    setSendingMsg(true);
    try {
      const payload = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderYear: getUserYear(),
        text: text.trim(),
        attachments: [...pendingFiles],
      };

      const newMsg = await api.postRoomMessage(activeRoom, payload);
      if (newMsg) {
        setMessages(prev => [
          ...prev,
          {
            id: newMsg.id || newMsg._id,
            senderId: newMsg.senderId,
            senderName: newMsg.senderName,
            senderRole: newMsg.senderRole,
            senderYear: newMsg.senderYear,
            text: newMsg.text,
            attachments: newMsg.attachments || [],
            timestamp: new Date(newMsg.createdAt || Date.now()),
            reactions: newMsg.reactions || {},
            roomId: activeRoom,
          },
        ]);
      }
      setText('');
      setPendingFiles([]);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingFiles(true);

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`"${file.name}" exceeds 50MB limit.`);
        continue;
      }
      try {
        const att = await api.uploadChatAttachment(file);
        if (att && att.url) {
          setPendingFiles(prev => [...prev, att]);
        }
      } catch (err) {
        console.error('File upload failed:', err);
        alert(`Failed to upload file "${file.name}".`);
      }
    }
    setUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (id: string) => setPendingFiles(prev => prev.filter(f => f.id !== id));

  const addReaction = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const updatedMsg = await api.reactToMessage(msgId, emoji, currentUser.id);
      if (updatedMsg) {
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? { ...m, reactions: updatedMsg.reactions || {} } : m))
        );
      }
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
    setShowEmojiPicker(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const groupedMessages: { dateLabel: string; msgs: ChatMsg[] }[] = [];
  filteredMessages.forEach(msg => {
    const label = formatDateHeader(msg.timestamp);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.dateLabel === label) last.msgs.push(msg);
    else groupedMessages.push({ dateLabel: label, msgs: [msg] });
  });

  const isOwn = (msg: ChatMsg) => currentUser?.id === msg.senderId;

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', height: 'calc(100vh - 130px)', minHeight: 500,
      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
      border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)',
    }}>

      {/* -- Sidebar -- */}
      <div style={{
        width: 230, minWidth: 180, background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-glass)', display: 'flex',
        flexDirection: 'column', flexShrink: 0,
      }} className="chat-sidebar">
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MessageCircle size={18} color="#4f46e5" /> Campus Chat
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {onlineCount} students online
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {(['general', 'senior', 'branch', 'year'] as const).map(type => {
            const typeRooms = ROOMS.filter(r => r.type === type);
            const labels: Record<string, string> = { general: 'GENERAL', senior: 'LOUNGES', branch: 'BRANCHES', year: 'YEAR GROUPS' };
            return (
              <div key={type} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px' }}>
                  {labels[type]}
                </div>
                {typeRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room.id)}
                    title={room.description}
                    style={{
                      width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: activeRoom === room.id ? 'rgba(79,70,229,0.12)' : 'transparent',
                      color: activeRoom === room.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: activeRoom === room.id ? 700 : 500, fontSize: '0.84rem', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</span>
                    {activeRoom === room.id && (
                      <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {currentUser && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
              {currentUser.name.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.name.split(' ')[0]}
              </div>
              <RoleBadge role={currentUser.role} year={getUserYear()} />
            </div>
          </div>
        )}
      </div>

      {/* -- Main Chat Area -- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {currentRoom.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentRoom.description}</div>
          </div>
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '5px 10px 5px 30px', borderRadius: 8,
                border: '1px solid var(--border-glass)', background: 'var(--bg-primary)',
                fontSize: '0.78rem', color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: '0.9rem' }}>
              No messages yet in {currentRoom.name}. Be the first to start the conversation!
            </div>
          ) : (
            groupedMessages.map(group => (
              <div key={group.dateLabel}>
                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 16px', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-glass)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 10px', borderRadius: 999 }}>{group.dateLabel}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-glass)' }} />
                </div>

                {group.msgs.map(msg => {
                  const own = isOwn(msg);
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex', gap: 10, marginBottom: 14,
                        flexDirection: own ? 'row-reverse' : 'row',
                        position: 'relative',
                      }}
                      onMouseLeave={() => setShowEmojiPicker(null)}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: own ? 'var(--gradient-primary)' : 'linear-gradient(135deg, #6b7280, #374151)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, marginTop: 2,
                      }}>
                        {msg.senderName.charAt(0)}
                      </div>

                      <div style={{ maxWidth: '72%', minWidth: 160 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
                          flexDirection: own ? 'row-reverse' : 'row',
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{msg.senderName}</span>
                          <RoleBadge role={msg.senderRole} year={msg.senderYear} />
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                        </div>

                        <div style={{
                          padding: '10px 14px', borderRadius: 14,
                          background: own ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'var(--bg-secondary)',
                          color: own ? '#ffffff' : 'var(--text-primary)',
                          border: own ? 'none' : '1px solid var(--border-glass)',
                          boxShadow: 'var(--shadow-sm)', position: 'relative',
                          borderTopLeftRadius: !own ? 2 : 14, borderTopRightRadius: own ? 2 : 14,
                        }}>
                          {msg.text && (
                            <div style={{ fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.text}
                            </div>
                          )}

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {msg.attachments.map(att => <AttachmentView key={att.id} att={att} />)}
                            </div>
                          )}

                          {/* Quick Emoji Trigger Button */}
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                            style={{
                              position: 'absolute', top: -10, [own ? 'left' : 'right']: -10,
                              width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--border-glass)',
                              background: 'var(--bg-primary)', color: 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', opacity: 0.8, transition: 'all 0.15s',
                            }}
                            title="Add reaction"
                          >
                            <Smile size={12} />
                          </button>

                          {/* Emoji Picker Popup */}
                          {showEmojiPicker === msg.id && (
                            <div style={{
                              position: 'absolute', top: -40, [own ? 'left' : 'right']: 0,
                              background: 'var(--bg-primary)', border: '1px solid var(--border-glass)',
                              borderRadius: 999, padding: '4px 8px', display: 'flex', gap: 4,
                              boxShadow: 'var(--shadow-md)', zIndex: 10,
                            }}>
                              {QUICK_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 3px', borderRadius: 4 }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reaction Badges */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, justifyContent: own ? 'flex-end' : 'flex-start' }}>
                            {Object.entries(msg.reactions).map(([emoji, uids]) => {
                              const hasReacted = currentUser && uids.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: '0.72rem', padding: '2px 7px', borderRadius: 999,
                                    border: `1px solid ${hasReacted ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                                    background: hasReacted ? 'rgba(79,70,229,0.12)' : 'var(--bg-secondary)',
                                    color: hasReacted ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer', fontWeight: 600,
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span>{uids.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachments Preview Bar */}
        {pendingFiles.length > 0 && (
          <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {pendingFiles.map(file => (
              <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                <span>{file.name}</span>
                <button onClick={() => removePendingFile(file.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept={ACCEPTED_EXTENSIONS}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
            title="Attach file (Images, Videos, Audio, PDFs, Docs, Code)"
            style={{
              padding: 10, borderRadius: 10, border: '1px solid var(--border-glass)',
              background: 'var(--bg-primary)', color: 'var(--text-secondary)',
              cursor: uploadingFiles ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {uploadingFiles ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentUser ? `Message #${currentRoom.name}... (Enter to send, Shift+Enter for newline)` : 'Sign in to send messages...'}
            disabled={!currentUser || sendingMsg}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: '1px solid var(--border-glass)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
              resize: 'none', maxHeight: 120, fontFamily: 'inherit', lineHeight: 1.4,
            }}
          />

          <button
            type="submit"
            disabled={!currentUser || sendingMsg || (!text.trim() && pendingFiles.length === 0)}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: currentUser && (text.trim() || pendingFiles.length > 0) ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
              color: currentUser && (text.trim() || pendingFiles.length > 0) ? '#ffffff' : 'var(--text-muted)',
              cursor: currentUser && (text.trim() || pendingFiles.length > 0) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.88rem',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
