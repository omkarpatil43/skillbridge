import {
  AcademicMaterial,
  SkillResource,
  Club,
  ClubEvent,
  ClubRegistration,
  DoubtQuestion,
  DoubtReply,
  CompanyPlacementInfo,
  Scholarship,
  User,
  StudentLevel,
} from '../types';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('skillbridge_auth_token_v2');

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

async function handleJsonResponse<T = any>(res: Response, defaultErrorMessage = 'Request failed'): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || (res.status === 404 ? 'Resource or API endpoint not found (404).' : `${defaultErrorMessage} (Status ${res.status})`);
    throw new Error(errorMsg);
  }

  return data as T;
}

export interface ChatApiResponse {
  message: string;
  conversationId: string;
}

export const api = {
  // Auth
  login: async (email: string, rollNo: string, password: string): Promise<{ success: boolean; user: User; token: string }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, rollNo, password }),
    });
    return handleJsonResponse<{ success: boolean; user: User; token: string }>(res, 'Login failed');
  },

  signup: async (formData: FormData): Promise<{
    success: boolean;
    user: User;
    token: string;
    analysis: {
      batchYears: string | null;
      batchStartYear: number | null;
      batchEndYear: number | null;
      rollNumber: string | null;
      studentName: string | null;
      confidence: 'high' | 'medium' | 'low';
      yearOfStudy: number;
      studentLevel: StudentLevel;
      displayLabel: string;
    };
  }> => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      body: formData,
    });
    return handleJsonResponse(res, 'Signup failed');
  },

  confirmSignup: async (
    token: string,
    confirmed: boolean,
    requestedLevel?: string,
    note?: string
  ): Promise<{ success: boolean; user: User; message: string }> => {
    const res = await fetch(`${API_BASE}/auth/signup/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmed, requestedLevel, note }),
    });
    return handleJsonResponse<{ success: boolean; user: User; message: string }>(res, 'Confirmation failed');
  },

  getCurrentUser: async (token: string): Promise<{ success: boolean; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleJsonResponse<{ success: boolean; user: User }>(res, 'Failed to fetch user profile');
  },

  getAdminPendingUsers: async (token: string, status?: string): Promise<{ success: boolean; count: number; users: User[] }> => {
    const url = status ? `${API_BASE}/auth/admin/pending?status=${encodeURIComponent(status)}` : `${API_BASE}/auth/admin/pending`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleJsonResponse<{ success: boolean; count: number; users: User[] }>(res, 'Failed to fetch pending users');
  },

  adminVerifyUser: async (
    token: string,
    userId: string,
    action: 'approve' | 'reject',
    studentLevel?: string,
    year?: string
  ): Promise<{ success: boolean; user: User; message: string }> => {
    const res = await fetch(`${API_BASE}/auth/admin/verify/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, studentLevel, year }),
    });
    return handleJsonResponse<{ success: boolean; user: User; message: string }>(res, 'Failed to update user verification');
  },

  chat: async (message: string, conversationId: string | undefined, token?: string): Promise<ChatApiResponse> => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, conversationId }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Chat request failed');
    return await res.json();
  },

  clearChat: async (conversationId: string): Promise<void> => {
    await fetch(`${API_BASE}/chat/${encodeURIComponent(conversationId)}`, { method: 'DELETE' });
  },

  // Academic
  getAcademicMaterials: async (filters?: { branch?: string; semester?: number; type?: string; search?: string }): Promise<AcademicMaterial[]> => {
    const params = new URLSearchParams();
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.semester) params.append('semester', filters.semester.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);
    const res = await fetch(`${API_BASE}/academic?${params.toString()}`);
    return await res.json();
  },

  
  addAcademicMaterial: async (mat: Omit<AcademicMaterial, 'id' | 'dateAdded' | 'downloadsCount'>): Promise<AcademicMaterial> => {
    const res = await fetch(`${API_BASE}/academic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(mat),
    });
    return await res.json();
  },

  removeAcademicMaterial: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/academic/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return await res.json();
  },

  incrementDownload: async (id: string): Promise<AcademicMaterial> => {
    const res = await fetch(`${API_BASE}/academic/${id}/download`, { method: 'POST' });
    return await res.json();
  },

  // Skills
  getSkillResources: async (): Promise<SkillResource[]> => {
  const res = await fetch(`${API_BASE}/skills`);

  return await handleJsonResponse<SkillResource[]>(
    res,
    'Failed to fetch skill resources'
  );
},

 
addSkillResource: async (
  resource: Omit<SkillResource, 'id' | 'dateAdded' | 'rating'>
): Promise<SkillResource> => {
  const res = await fetch(`${API_BASE}/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(resource),
  });

  return await handleJsonResponse<SkillResource>(
    res,
    'Failed to add skill resource'
  );
},


  
removeSkillResource: async (id: string): Promise<{ success: boolean }> => {
  const res = await fetch(`${API_BASE}/skills/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return await handleJsonResponse<{ success: boolean }>(
    res,
    'Failed to remove skill resource'
  );
},


  // Clubs
  getClubs: async (): Promise<Club[]> => {
    const res = await fetch(`${API_BASE}/clubs`);
    return await res.json();
  },

  addClub: async (club: Partial<Club>): Promise<Club> => {
    const res = await fetch(`${API_BASE}/clubs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(club),
    });
    return handleJsonResponse(res, 'Failed to create club');
  },

  updateClub: async (id: string, club: Partial<Club>): Promise<Club> => {
    const res = await fetch(`${API_BASE}/clubs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(club),
    });
    return handleJsonResponse(res, 'Failed to update club');
  },

  removeClub: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/clubs/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  clubAdminSignup: async (data: { email: string; name: string; password: string; clubName: string; phone?: string }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/auth/signup-club-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleJsonResponse(res, 'Club admin signup failed');
  },

  addClubEvent: async (clubId: string, event: Omit<ClubEvent, 'id' | 'clubId' | 'registeredCount'>): Promise<ClubEvent> => {
    const res = await fetch(`${API_BASE}/clubs/${clubId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return await res.json();
  },

  removeClubEvent: async (eventId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/clubs/events/${eventId}`, { method: 'DELETE' });
    return await res.json();
  },

  registerForClub: async (reg: Omit<ClubRegistration, 'id' | 'appliedDate' | 'status'>): Promise<ClubRegistration> => {
    const res = await fetch(`${API_BASE}/clubs/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg),
    });
    return await res.json();
  },

  getClubRegistrations: async (): Promise<ClubRegistration[]> => {
    const res = await fetch(`${API_BASE}/clubs/registrations`);
    return await res.json();
  },

  acceptClubRegistration: async (id: string): Promise<ClubRegistration> => {
    const res = await fetch(`${API_BASE}/clubs/registrations/${id}/accept`, { method: 'PUT' });
    return await res.json();
  },

  rejectClubRegistration: async (id: string): Promise<ClubRegistration> => {
    const res = await fetch(`${API_BASE}/clubs/registrations/${id}/reject`, { method: 'PUT' });
    return await res.json();
  },

  removeClubRegistration: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/clubs/registrations/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  rsvpEvent: async (eventId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/clubs/events/${eventId}/rsvp`, { method: 'POST' });
    return await res.json();
  },

  // Doubts
  getDoubts: async (): Promise<DoubtQuestion[]> => {
    const res = await fetch(`${API_BASE}/doubts`);
    return await res.json();
  },

  postDoubt: async (doubt: Omit<DoubtQuestion, 'id' | 'date' | 'upvotes' | 'solved' | 'replies'>): Promise<DoubtQuestion> => {
    const res = await fetch(`${API_BASE}/doubts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doubt),
    });
    return await res.json();
  },

  removeDoubt: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/doubts/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  replyToDoubt: async (doubtId: string, reply: Omit<DoubtReply, 'id' | 'date' | 'upvotes'>): Promise<DoubtReply> => {
    const res = await fetch(`${API_BASE}/doubts/${doubtId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reply),
    });
    return await res.json();
  },

  removeReply: async (doubtId: string, replyId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/doubts/${doubtId}/replies/${replyId}`, { method: 'DELETE' });
    return await res.json();
  },

  verifyReply: async (doubtId: string, replyId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/doubts/${doubtId}/replies/${replyId}/verify`, { method: 'PUT' });
    return await res.json();
  },

  upvoteDoubt: async (doubtId: string): Promise<{ upvotes: number }> => {
    const res = await fetch(`${API_BASE}/doubts/${doubtId}/upvote`, { method: 'POST' });
    return await res.json();
  },

  upvoteReply: async (doubtId: string, replyId: string): Promise<{ upvotes: number }> => {
    const res = await fetch(`${API_BASE}/doubts/${doubtId}/replies/${replyId}/upvote`, { method: 'POST' });
    return await res.json();
  },

  // Placements
  getCompanies: async (): Promise<CompanyPlacementInfo[]> => {
    const res = await fetch(`${API_BASE}/placements`);
    return await res.json();
  },

  
addCompany: async (company: Omit<CompanyPlacementInfo, 'id'>): Promise<CompanyPlacementInfo> => {
  const res = await fetch(`${API_BASE}/placements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(company),
  });
  return await handleJsonResponse<CompanyPlacementInfo>(
    res,
    'Failed to add company'
  );
},

updateCompany: async (id: string, company: Partial<CompanyPlacementInfo>): Promise<CompanyPlacementInfo> => {
  const res = await fetch(`${API_BASE}/placements/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(company),
  });
  return await handleJsonResponse<CompanyPlacementInfo>(
    res,
    'Failed to update company'
  );
},

removeCompany: async (id: string): Promise<{ success: boolean }> => {
  const res = await fetch(`${API_BASE}/placements/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return await handleJsonResponse<{ success: boolean }>(
    res,
    'Failed to remove company'
  );
},


  // Scholarships
  getScholarships: async (): Promise<Scholarship[]> => {
    const res = await fetch(`${API_BASE}/scholarships`);
    return await res.json();
  },

  
  addScholarship: async (scholarship: Omit<Scholarship, 'id'>): Promise<Scholarship> => {
    const res = await fetch(`${API_BASE}/scholarships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(scholarship),
    });
    return await handleJsonResponse<Scholarship>(res, 'Failed to add scholarship');
  },


  
removeScholarship: async (id: string): Promise<{ success: boolean }> => {
  const res = await fetch(`${API_BASE}/scholarships/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return await handleJsonResponse<{ success: boolean }>(
    res,
    'Failed to remove scholarship'
  );
},


  // Initial Admin Setup Wizard
  getSetupStatus: async (): Promise<{ hasAdmin: boolean }> => {
    const res = await fetch(`${API_BASE}/setup/status`);
    if (!res.ok) throw new Error('Failed to fetch setup status');
    return await res.json();
  },

  verifySetupKey: async (accessKey: string): Promise<{ success: boolean; setupToken?: string; error?: string; isRateLimited?: boolean }> => {
    const res = await fetch(`${API_BASE}/setup/verify-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey }),
    });
    if (res.status === 429) {
      return { success: false, isRateLimited: true, error: 'Too many attempts. Please try again later.' };
    }
    try {
      const data = await handleJsonResponse(res, 'Invalid key or setup already completed.');
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid key or setup already completed.' };
    }
  },

  createAdmin: async (payload: { setupToken: string; name: string; email: string; password: string }): Promise<{ success: boolean; message?: string; user?: User; token?: string; error?: string }> => {
    const res = await fetch(`${API_BASE}/setup/create-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    try {
      const data = await handleJsonResponse(res, 'Failed to create admin account.');
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create admin account.' };
    }
  },

  // Campus Community Chat
  getRoomMessages: async (roomId: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/chat/community/rooms/${roomId}/messages`);
    return await handleJsonResponse(res, 'Failed to fetch room messages');
  },

  postRoomMessage: async (roomId: string, messageData: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/chat/community/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });
    return await handleJsonResponse(res, 'Failed to post message');
  },

  reactToMessage: async (messageId: string, emoji: string, userId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/chat/community/messages/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId }),
    });
    return await handleJsonResponse(res, 'Failed to update reaction');
  },

  uploadChatAttachment: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/chat/community/upload`, {
      method: 'POST',
      body: formData,
    });
    return await handleJsonResponse(res, 'Failed to upload attachment');
  },
};
