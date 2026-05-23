import mongoose from 'mongoose';
import dns from 'dns';
import User from './src/models/User.js';

// Configure DNS to use public Google DNS to bypass Node Windows SRV lookup bugs
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (dnsErr) {
  console.warn(`[Database] Custom DNS config skipped: ${dnsErr.message}`);
}

const MONGO_URI = 'mongodb+srv://gowtham:567891234Gk@disciplinex.aldqgda.mongodb.net/?appName=DisciplineX';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');
    const users = await User.find({}).sort({ createdAt: -1 }).limit(10);
    console.log(`\nFound ${users.length} recent user(s):`);
    for (const u of users) {
      console.log({
        id: u._id,
        name: u.name,
        email: u.email,
        isVerified: u.isVerified,
        emailVerificationToken: u.emailVerificationToken,
        emailVerificationExpires: u.emailVerificationExpires,
        createdAt: u.createdAt
      });
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error querying MongoDB:', error);
  }
}

main();
