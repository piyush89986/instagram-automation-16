import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { env } from './env';

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = env.MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ig-saas';

    // Set connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection lost. Reconnecting...');
    });

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 25,
      minPoolSize: 2,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (env.isProduction) {
      process.exit(1);
    }
  }
};
