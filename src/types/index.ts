// ─── Auth & Verification Types ────────────────────────────────────
// `senior` is retained for existing student profiles; elevated roles are never public-signup roles.
export type UserRole = 'student' | 'senior' | 'club_admin' | 'college_admin' | 'admin';

export type StudentLevel = 'Fresher' | 'SecondYear' | 'ThirdYear' | 'FinalYear' | 'Alumni' | 'Invalid';

export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected';

export interface User {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  branch: string;
  year: string;
  role: UserRole;
  managedClubId?: string;
  isApproved?: boolean;
  adminStatus?: 'Active' | 'Pending' | 'Revoked';
  avatar?: string;
  clubName?: string; // For club admins
  bio?: string;
  badges?: string[];
  reputation?: number;
  passwordHash?: string;
  // ── ID Verification fields ──
  idCardImageRef?: string;
  batchStartYear?: number;
  batchEndYear?: number;
  yearOfStudy?: number;
  studentLevel?: StudentLevel;
  verificationStatus?: VerificationStatus;
  ocrConfidenceScore?: number;
  verifiedAt?: string;
}

/** Signup step-1 response from backend after OCR analysis */
export interface SignupAnalysisResult {
  tempUserId: string;
  batchStartYear: number;
  batchEndYear: number;
  yearOfStudy: number;
  studentLevel: StudentLevel;
  detectedRollNo?: string;
  detectedName?: string;
  confidence: 'high' | 'medium' | 'low';
  ocrConfidenceScore: number;
  message: string;
}

/** Signup confirmation response */
export interface SignupConfirmResult {
  success: boolean;
  user: User;
  token: string;
}

/** Login response */
export interface LoginResult {
  success: boolean;
  user: User;
  token: string;
  isPending?: boolean;
  message?: string;
}

/** Admin pending user entry */
export interface PendingUserEntry {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  branch: string;
  batchStartYear?: number;
  batchEndYear?: number;
  yearOfStudy?: number;
  studentLevel?: StudentLevel;
  verificationStatus: VerificationStatus;
  ocrConfidenceScore?: number;
  createdAt: string;
}

// ─── Academic & Platform Types ────────────────────────────────────
export interface AcademicMaterial {
  id: string;
  title: string;
  branch: string;
  semester: number;
  subject: string;
  type: 'drive' | 'pdf' | 'pyq' | 'notes' | 'syllabus' | 'video' | 'lab';
  description: string;
  link: string;
  authorName: string;
  authorRole: UserRole;
  authorRollNo?: string;
  dateAdded: string;
  downloadsCount: number;
  tags: string[];
}

export interface SkillResource {
  id: string;
  title: string;
  category: 'Web Dev' | 'AI & ML' | 'Cloud & DevOps' | 'Cybersecurity' | 'App Dev' | 'Data Science' | 'Core Engineering';
  type: 'video' | 'drive' | 'pdf' | 'link' | 'roadmap' | 'repo';
  description: string;
  link: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: string;
  authorName: string;
  authorRole: UserRole;
  dateAdded: string;
  rating: number;
  tags: string[];
}

export interface ClubEvent {
  id: string;
  clubId: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  bannerImage: string;
  registrationLink?: string;
  registrationOpen: boolean;
  registeredCount: number;
  tags: string[];
}

export interface Club {
  id: string;
  name: string;
  category: 'Technical' | 'Cultural' | 'Entrepreneurship' | 'Sports' | 'Social & Community';
  tagline: string;
  description: string;
  logo: string;
  banner: string;
  leadName: string;
  leadRole: string;
  leadEmail: string;
  leadPhone: string;
  recruitmentOpen: boolean;
  memberCount: number;
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  events: ClubEvent[];
}

export interface ClubRegistration {
  id: string;
  clubId: string;
  clubName: string;
  studentName: string;
  rollNo: string;
  email: string;
  branch: string;
  year: string;
  interestReason: string;
  phone: string;
  skills: string;
  experience: string;
  portfolioLink?: string;
  appliedDate: string;
  status: 'pending' | 'accepted' | 'reviewed' | 'rejected';
}

export interface DoubtReply {
  id: string;
  authorName: string;
  authorRole: UserRole;
  authorRollNo: string;
  content: string;
  codeSnippet?: string;
  date: string;
  isSeniorVerified?: boolean;
  upvotes: number;
}

export interface DoubtQuestion {
  id: string;
  title: string;
  description: string;
  codeSnippet?: string;
  branch: string;
  subject: string;
  authorName: string;
  authorRole: UserRole;
  authorRollNo: string;
  date: string;
  tags: string[];
  upvotes: number;
  solved: boolean;
  replies: DoubtReply[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  category?: 'academic' | 'skill' | 'campus' | 'placement';
  codeSnippet?: string;
  suggestedPrompts?: string[];
}

export interface CompanyPlacementInfo {
  id: string;
  name: string;
  logo: string;
  tier: 'Dream (20+ LPA)' | 'Super Dream (12-20 LPA)' | 'Standard (6-12 LPA)' | 'Mass / Service (3.5-6 LPA)';
  packageLPA: string;
  eligibleBranches: string[];
  hiringRounds: string[];
  prepRoadmapLink: string;
  driveLink: string;
  overview: string;
  importantTopics: string[];
  recentInterviewExperiences: {
    studentName: string;
    batch: string;
    role: string;
    roundDetails: string;
    tips: string;
  }[];
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  category: 'Merit-Based' | 'Need-Based / EWS' | 'Women in STEM' | 'Government Schemes' | 'Corporate CSR';
  amount: string;
  deadline: string;
  eligibleBranches: string[];
  eligibleYears: string[];
  cgpaCriteria: string;
  description: string;
  applicationLink: string;
  officialDriveLink: string;
  documentsRequired: string[];
  status: 'Open' | 'Closing Soon' | 'Upcoming';
}
