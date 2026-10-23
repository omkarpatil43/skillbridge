import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  UserRole,
} from '../src/types';
import {
  INITIAL_ACADEMIC_MATERIALS,
  INITIAL_SKILL_RESOURCES,
  INITIAL_CLUBS,
  INITIAL_DOUBTS,
  INITIAL_COMPANIES,
  INITIAL_SCHOLARSHIPS,
} from '../src/data/initialData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DEMO_USER_EMAILS = new Set(['student@pict.edu', 'senior@pict.edu', 'clublead@pict.edu']);
const DEMO_USER_IDS = new Set(['u-1', 'u-2', 'u-3']);

export interface DatabaseSchema {
  users: User[];
  academicMaterials: AcademicMaterial[];
  skillResources: SkillResource[];
  clubs: Club[];
  clubRegistrations: ClubRegistration[];
  doubts: DoubtQuestion[];
  companies: CompanyPlacementInfo[];
  scholarships: Scholarship[];
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(fileContent) as DatabaseSchema;
        const existingUsers = data.users || [];
        data.users = existingUsers.filter(
          user => !DEMO_USER_EMAILS.has(user.email.trim().toLowerCase()) && !DEMO_USER_IDS.has(user.id)
        );
        if (data.users.length !== existingUsers.length) {
          this.saveDatabase(data);
        }
        return data;
      }
    } catch (err) {
      console.error('Error reading database file, re-initializing with seed data:', err);
    }

    // Initialize with rich pre-populated seed data
    const initialDb: DatabaseSchema = {
      users: [],
      academicMaterials: INITIAL_ACADEMIC_MATERIALS,
      skillResources: INITIAL_SKILL_RESOURCES,
      clubs: INITIAL_CLUBS,
      clubRegistrations: [],
      doubts: INITIAL_DOUBTS,
      companies: INITIAL_COMPANIES,
      scholarships: INITIAL_SCHOLARSHIPS,
    };

    this.saveDatabase(initialDb);
    return initialDb;
  }

  public saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  // ==========================================
  // USERS & AUTH METHODS
  // ==========================================
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUser(predicate: (u: User) => boolean): User | undefined {
    return this.data.users.find(predicate);
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByRollOrEmail(rollNo: string, email: string): User | undefined {
    const cleanRoll = rollNo ? rollNo.trim().toUpperCase() : '';
    const cleanEmail = email.trim().toLowerCase();
    return this.data.users.find(
      u => (cleanRoll && u.rollNo?.toUpperCase() === cleanRoll) || u.email.toLowerCase() === cleanEmail
    );
  }

  public saveUser(userData: User): User {
    const idx = this.data.users.findIndex(u => u.id === userData.id || u.email.toLowerCase() === userData.email.toLowerCase());
    if (idx >= 0) {
      this.data.users[idx] = { ...this.data.users[idx], ...userData };
      this.saveDatabase();
      return this.data.users[idx];
    } else {
      this.data.users.unshift(userData);
      this.saveDatabase();
      return userData;
    }
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    this.saveDatabase();
    return user;
  }

  public createUser(userData: {
    name: string;
    rollNo: string;
    email: string;
    branch: string;
    year: string;
    role: UserRole;
    clubName?: string;
    passwordHash?: string;
  }): User {
    const cleanRoll = userData.rollNo ? userData.rollNo.trim().toUpperCase() : '';
    const cleanEmail = userData.email.trim().toLowerCase();

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: userData.name.trim(),
      rollNo: cleanRoll,
      email: cleanEmail,
      branch: userData.branch,
      year: userData.year,
      role: userData.role,
      clubName: userData.clubName,
      passwordHash: userData.passwordHash,
      avatar: userData.role === 'senior'
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
        : userData.role === 'college_admin' || (userData.role as string) === 'admin'
        ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      bio: `${userData.role.toUpperCase()} | ${userData.branch} | SkillBridge Scholar.`,
      badges: [userData.role === 'senior' ? 'Senior Mentor' : userData.role === 'college_admin' ? 'Institute Admin' : 'Student'],
      reputation: userData.role === 'senior' ? 250 : 30,
    };

    this.data.users.unshift(newUser);
    this.saveDatabase();
    return newUser;
  }

  // ==========================================
  // ACADEMIC MATERIALS
  // ==========================================
  public getAcademicMaterials(filters?: { branch?: string; semester?: number; type?: string; search?: string }): AcademicMaterial[] {
    let result = this.data.academicMaterials;

    if (filters?.branch && filters.branch !== 'All') {
      result = result.filter(m => m.branch === filters.branch || m.branch === 'Common / All Branches');
    }
    if (filters?.semester) {
      result = result.filter(m => m.semester === Number(filters.semester));
    }
    if (filters?.type && filters.type !== 'All') {
      result = result.filter(m => m.type === filters.type);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        m => m.title.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public addAcademicMaterial(mat: Omit<AcademicMaterial, 'id' | 'dateAdded' | 'downloadsCount'>): AcademicMaterial {
    const newMat: AcademicMaterial = {
      ...mat,
      id: `mat-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      downloadsCount: 1,
    };
    this.data.academicMaterials.unshift(newMat);
    this.saveDatabase();
    return newMat;
  }

  public incrementMaterialDownload(id: string): AcademicMaterial | null {
    const mat = this.data.academicMaterials.find(m => m.id === id);
    if (mat) {
      mat.downloadsCount += 1;
      this.saveDatabase();
      return mat;
    }
    return null;
  }

  // ==========================================
  // SKILL RESOURCES
  // ==========================================
  public getSkillResources(filters?: { category?: string; level?: string; type?: string; search?: string }): SkillResource[] {
    let result = this.data.skillResources;

    if (filters?.category && filters.category !== 'All') {
      result = result.filter(s => s.category === filters.category);
    }
    if (filters?.level && filters.level !== 'All') {
      result = result.filter(s => s.level === filters.level);
    }
    if (filters?.type && filters.type !== 'All') {
      result = result.filter(s => s.type === filters.type);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public addSkillResource(res: Omit<SkillResource, 'id' | 'dateAdded' | 'rating'>): SkillResource {
    const newRes: SkillResource = {
      ...res,
      id: `sk-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      rating: 5.0,
    };
    this.data.skillResources.unshift(newRes);
    this.saveDatabase();
    return newRes;
  }

  // ==========================================
  // CLUBS & EVENTS
  // ==========================================
  public getClubs(): Club[] {
    return this.data.clubs;
  }

  public addClub(clubData: Club): Club {
    this.data.clubs.unshift(clubData);
    this.saveDatabase();
    return clubData;
  }

  public updateClub(id: string, updates: Partial<Club>): Club | null {
    const club = this.data.clubs.find(c => c.id === id);
    if (!club) return null;
    Object.assign(club, updates);
    this.saveDatabase();
    return club;
  }

  public removeClub(id: string): boolean {
    const lenBefore = this.data.clubs.length;
    this.data.clubs = this.data.clubs.filter(c => c.id !== id);
    if (this.data.clubs.length !== lenBefore) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public removeAcademicMaterial(id: string): boolean {
    const len = this.data.academicMaterials.length;
    this.data.academicMaterials = this.data.academicMaterials.filter(m => m.id !== id);
    if (this.data.academicMaterials.length !== len) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public removeSkillResource(id: string): boolean {
    const len = this.data.skillResources.length;
    this.data.skillResources = this.data.skillResources.filter(s => s.id !== id);
    if (this.data.skillResources.length !== len) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public removeDoubt(id: string): boolean {
    const len = this.data.doubts.length;
    this.data.doubts = this.data.doubts.filter(d => d.id !== id);
    if (this.data.doubts.length !== len) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public addClubEvent(clubId: string, eventData: Omit<ClubEvent, 'id' | 'clubId' | 'registeredCount'>): ClubEvent | null {
    const club = this.data.clubs.find(c => c.id === clubId);
    if (!club) return null;

    const newEvent: ClubEvent = {
      ...eventData,
      id: `ev-${Date.now()}`,
      clubId,
      registeredCount: 0,
    };

    club.events.unshift(newEvent);
    this.saveDatabase();
    return newEvent;
  }

  public getClubRegistrations(): ClubRegistration[] {
    return this.data.clubRegistrations;
  }

  public registerForClub(regData: Omit<ClubRegistration, 'id' | 'appliedDate' | 'status'>): ClubRegistration {
    const newReg: ClubRegistration = {
      ...regData,
      id: `reg-${Date.now()}`,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
    this.data.clubRegistrations.unshift(newReg);
    this.saveDatabase();
    return newReg;
  }

  public rsvpEvent(eventId: string): boolean {
    let found = false;
    for (const club of this.data.clubs) {
      const ev = club.events.find(e => e.id === eventId);
      if (ev) {
        ev.registeredCount += 1;
        found = true;
        break;
      }
    }
    if (found) this.saveDatabase();
    return found;
  }

  // ==========================================
  // DOUBTS & MENTORSHIP
  // ==========================================
  public getDoubts(): DoubtQuestion[] {
    return this.data.doubts;
  }

  public postDoubt(doubt: Partial<DoubtQuestion> & { title: string; description: string; subject: string; branch: string; authorName: string; authorRole: string; authorRollNo: string }): DoubtQuestion {
    const newDoubt: DoubtQuestion = {
      tags: [],
      ...doubt,
      id: doubt.id || `d-${Date.now()}`,
      date: doubt.date || new Date().toISOString().split('T')[0],
      upvotes: doubt.upvotes ?? 0,
      solved: doubt.solved ?? false,
      replies: doubt.replies || [],
    };
    this.data.doubts.unshift(newDoubt);
    this.saveDatabase();
    return newDoubt;
  }

  public replyToDoubt(doubtId: string, reply: Partial<DoubtReply> & { content: string; authorName: string; authorRole: string; authorRollNo: string }): DoubtReply | null {
    const doubt = this.data.doubts.find(d => d.id === doubtId);
    if (!doubt) return null;

    const isSeniorVerified = reply.isSeniorVerified ?? (reply.authorRole === 'senior' || reply.authorRole === 'admin' || reply.authorRole === 'college_admin');
    const newReply: DoubtReply = {
      ...reply,
      id: reply.id || `rep-${Date.now()}`,
      date: reply.date || new Date().toISOString().split('T')[0],
      upvotes: reply.upvotes ?? 0,
      isSeniorVerified,
    };

    doubt.replies.push(newReply);
    if (isSeniorVerified) doubt.solved = true;

    this.saveDatabase();
    return newReply;
  }

  public verifyReply(doubtId: string, replyId: string): boolean {
    const doubt = this.data.doubts.find(d => d.id === doubtId);
    if (!doubt) return false;

    const reply = doubt.replies.find(r => r.id === replyId);
    if (reply) {
      reply.isSeniorVerified = true;
      doubt.solved = true;
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public upvoteDoubt(doubtId: string): number | null {
    const doubt = this.data.doubts.find(d => d.id === doubtId);
    if (doubt) {
      doubt.upvotes += 1;
      this.saveDatabase();
      return doubt.upvotes;
    }
    return null;
  }

  public upvoteReply(doubtId: string, replyId: string): number | null {
    const doubt = this.data.doubts.find(d => d.id === doubtId);
    if (!doubt) return null;
    const reply = doubt.replies.find(r => r.id === replyId);
    if (reply) {
      reply.upvotes += 1;
      this.saveDatabase();
      return reply.upvotes;
    }
    return null;
  }

  // ==========================================
  // PLACEMENTS & SCHOLARSHIPS
  // ==========================================
  public getCompanies(): CompanyPlacementInfo[] {
    return this.data.companies;
  }

  public getScholarships(): Scholarship[] {
    return this.data.scholarships;
  }

  // ==========================================
  // CLUB EVENTS & REGISTRATIONS (extra helpers)
  // ==========================================

  public removeClubEvent(eventId: string): boolean {
    let found = false;
    for (const club of this.data.clubs) {
      const before = club.events.length;
      club.events = club.events.filter(e => e.id !== eventId);
      if (club.events.length !== before) {
        found = true;
        break;
      }
    }
    if (found) this.saveDatabase();
    return found;
  }

  public removeClubRegistration(id: string): boolean {
    const before = this.data.clubRegistrations.length;
    this.data.clubRegistrations = this.data.clubRegistrations.filter(r => r.id !== id);
    if (this.data.clubRegistrations.length !== before) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public acceptClubRegistration(id: string): ClubRegistration | null {
    const reg = this.data.clubRegistrations.find(r => r.id === id);
    if (reg) {
      reg.status = 'accepted';
      this.saveDatabase();
      return reg;
    }
    return null;
  }

  public rejectClubRegistration(id: string): ClubRegistration | null {
    const reg = this.data.clubRegistrations.find(r => r.id === id);
    if (reg) {
      reg.status = 'rejected';
      this.saveDatabase();
      return reg;
    }
    return null;
  }
}

export const db = new Database();
