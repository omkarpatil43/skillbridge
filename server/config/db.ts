import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import dns from 'node:dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // ignore if restricted
}

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });
console.log(`Loading environment from: ${envPath}`);

export type MongoStatus = 'not_configured' | 'misconfigured' | 'connected' | 'permission_denied' | 'unavailable';

let mongoStatus: MongoStatus = 'not_configured';

// Prevent Mongoose from hanging for 10,000ms per query when disconnected
mongoose.set('bufferCommands', false);

export const getMongoStatus = (): MongoStatus => mongoStatus;
export const isMongoConnected = (): boolean => mongoStatus === 'connected';

export const connectDB = async (): Promise<boolean> => {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    mongoStatus = 'not_configured';
    console.warn('MONGO_URI is not configured. Using the local persistent data store.');
    return false;
  }

  if (mongoUri.startsWith('mongodb+srv://')) {
    const authority = mongoUri.slice('mongodb+srv://'.length).split('/')[0];
    if (!authority.includes('@')) {
      mongoStatus = 'misconfigured';
      console.error('MONGO_URI is missing Atlas database-user credentials. Create a MongoDB database user with readWrite access to skillbridge, then set the Atlas Drivers connection string in .env.');
      return false;
    }
  }

  try {
    const conn = await mongoose.connect(mongoUri, { dbName: 'skillbridge' });
    try {
      await conn.connection.db!.collection('academicmaterials').findOne(
        {},
        { projection: { _id: 1 }, maxTimeMS: 5000 },
      );
    } catch (error) {
      const dbError = error as { codeName?: string; code?: number; name?: string };
      if (dbError.codeName === 'Unauthorized' || dbError.code === 13) {
        mongoStatus = 'permission_denied';
        console.error('MongoDB connected, but the configured database user cannot read skillbridge collections. Grant the user readWrite access to the skillbridge database.');
        return false;
      }
      throw error;
    }
    mongoStatus = 'connected';
    console.log(`ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â¿ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    console.log('MongoDB connection established.');
    return true;
  } catch (error) {
    mongoStatus = 'unavailable';
    // Never log the driver error object/message: it can include a connection URI.
    const dbError = error as { name?: string; code?: string; message?: string };
    const errorSignature = `${dbError.name || ''} ${dbError.code || ''} ${dbError.message || ''}`;
    const sanitizedMsg = (dbError.message || '').replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[REDACTED_URI]');
    if (/querysrv|etimeout|enotfound|dns/i.test(errorSignature)) {
      console.error(`MongoDB DNS SRV lookup failed [${dbError.name || 'Error'}]: ${sanitizedMsg}`);
    } else if (/auth|authentication|bad auth/i.test(errorSignature)) {
      console.error(`MongoDB authentication failed [${dbError.name || 'Error'}]: ${sanitizedMsg}`);
    } else {
      console.error(`MongoDB connection failed [${dbError.name || 'Error'}${dbError.code ? ' Code:' + dbError.code : ''}]: ${sanitizedMsg}`);
    }
    return false;
  }
};
