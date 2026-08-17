import { Mongoose } from 'mongoose';

declare global {
  // This tells TypeScript that global.mongoose is perfectly fine to use
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  } | undefined;
}
