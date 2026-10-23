import mongoose from 'mongoose';
import { db } from '../db.js';
import { connectDB } from '../config/db.js';
import { UserModel } from '../models/User.js';

const DEMO_USER_EMAILS = ['student@pict.edu', 'senior@pict.edu', 'clublead@pict.edu'];

const removeDemoUsers = async () => {
  db.getUsers();

  if (!await connectDB()) {
    throw new Error('MongoDB is unavailable; local demo records were cleaned, but MongoDB records were not changed.');
  }

  const result = await UserModel.deleteMany({ email: { $in: DEMO_USER_EMAILS } });
  console.log(`Removed ${result.deletedCount ?? 0} demo user record(s) from MongoDB.`);
  await mongoose.disconnect();
};

removeDemoUsers().catch(async error => {
  console.error('Demo user cleanup failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
