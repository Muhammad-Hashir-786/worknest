import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Define MONGODB_URI in .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development, and to prevent connection pooling issues in serverless.
 * `cached` is guaranteed non-undefined below (we assign it if missing), but
 * TS can't track that across the module-level `let`, hence the local const.
 */
globalThis.mongoose ??= { conn: null, promise: null };
const cached = globalThis.mongoose;

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
