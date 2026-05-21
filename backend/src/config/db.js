import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Configure DNS to use public Google DNS to bypass Node Windows SRV lookup bugs
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (dnsErr) {
  console.warn(`[Database] Custom DNS config skipped: ${dnsErr.message}`);
}

let isFallbackDb = false;

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/disciplinex';
    console.log(`[Database] Attempting to connect to MongoDB...`);
    
    // Set selection timeout to 4 seconds to trigger fallback quickly if database is offline
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 4000, 
    });
    
    console.log(`[Database] Successfully connected to MongoDB!`);
    isFallbackDb = false;
  } catch (error) {
    console.warn(`\n======================================================================`);
    console.warn(`[WARNING] MongoDB Connection Failed: ${error.message}`);
    console.warn(`[NOTICE] Falling back to the local JSON File Database for offline storage.`);
    console.warn(`[STATUS] The application remains 100% operational. No action required!`);
    console.warn(`======================================================================\n`);
    isFallbackDb = true;
  }
};

export const checkFallback = () => isFallbackDb;
export const setFallback = (value) => { isFallbackDb = value; };
