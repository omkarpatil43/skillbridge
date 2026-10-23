import mongoose, { Schema, Document } from 'mongoose';

export interface IClubRegistrationDocument extends Document {
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

const ClubRegistrationSchema = new Schema<IClubRegistrationDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    clubId: { type: String, required: true, index: true },
    clubName: { type: String, required: true },
    studentName: { type: String, required: true },
    rollNo: { type: String, required: true, index: true },
    email: { type: String, required: true },
    branch: { type: String, required: true },
    year: { type: String, required: true },
    interestReason: { type: String, required: true },
    phone: { type: String, required: true },
    skills: { type: String, required: true },
    experience: { type: String, required: true },
    portfolioLink: { type: String },
    appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    status: { type: String, enum: ['pending', 'accepted', 'reviewed', 'rejected'], default: 'pending' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ClubRegistrationModel = mongoose.model<IClubRegistrationDocument>(
  'ClubRegistration',
  ClubRegistrationSchema
);
