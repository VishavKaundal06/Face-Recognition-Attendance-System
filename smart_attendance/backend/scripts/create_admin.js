#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const isLocalMongoUri = (uri = '') => /localhost|127\.0\.0\.1|::1/.test(uri);

const usage = () => {
  console.log('Usage: npm --prefix backend run create-admin -- [username] [email] [password] [role]');
  console.log('Example: npm --prefix backend run create-admin -- admin admin@example.com StrongPass123 admin');
};

const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidUsername = (username = '') => /^[a-zA-Z0-9_.-]{3,32}$/.test(username);

async function main() {
  const [usernameArg, emailArg, passwordArg, roleArg] = process.argv.slice(2);

  if (usernameArg === '--help' || usernameArg === '-h') {
    usage();
    process.exit(0);
  }

  const username = usernameArg || 'admin';
  const email = emailArg || 'admin@example.com';
  const password = passwordArg || 'admin12345';
  const role = roleArg || 'admin';

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in backend/.env');
    process.exit(1);
  }

  if (!['admin', 'teacher', 'staff'].includes(role)) {
    console.error('Invalid role. Use one of: admin, teacher, staff');
    process.exit(1);
  }

  if (!isValidUsername(username)) {
    console.error('Invalid username. Use 3-32 chars: letters, numbers, _, ., -');
    process.exit(1);
  }

  if (!isValidEmail(email)) {
    console.error('Invalid email format.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('Invalid password. Minimum length is 8 characters.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000
    });

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      console.log('User already exists.');
      console.log(`username: ${existing.username}`);
      console.log(`email: ${existing.email}`);
      process.exit(0);
    }

    const user = new User({ username, email, password, role });
    await user.save();

    console.log('Admin user created successfully.');
    console.log(`username: ${username}`);
    console.log(`email: ${email}`);
    console.log(`role: ${role}`);
  } catch (error) {
    console.error('Failed to create admin:', error.message);

    if (isLocalMongoUri(process.env.MONGO_URI || '')) {
      console.error('Hint: start local MongoDB and retry (npm run mongo:start).');
    } else {
      console.error('Hint: verify remote MONGO_URI, network access, and DB user permissions.');
    }

    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
