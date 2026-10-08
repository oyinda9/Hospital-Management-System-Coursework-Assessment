// Shared preparation that runs before every test file.
// Two modes:
//   npm test           -> dummy data in a temporary in-memory MongoDB (default, used in CI)
//   npm run test:real  -> dummy data in a TEMPORARY database on the real Atlas cluster
// In both modes the app's own database connection is replaced, so tests
// never touch the live hospital database.
import { vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "dotenv";
import { fileURLToPath } from "url";

const REAL_MODE = process.env.TEST_DB === "real";

// ---- Real mode only: read the Atlas connection string from config.env ----
let realUri;
if (REAL_MODE) {
  config({ path: fileURLToPath(new URL("../config/config.env", import.meta.url)) });
  realUri = process.env.MONGO_URI;
  if (!realUri) throw new Error("MONGO_URI not found in config/config.env");
}

// ---- Safety net ----
// If the app's own connection code ever runs, it points nowhere, never at Atlas.
process.env.MONGO_URI = "mongodb://127.0.0.1:1/never-used";

// ---- Fake environment variables (no real secrets in tests) ----
process.env.JWT_SECRET_KEY = "test-secret";
process.env.JWT_EXPIRES = "1d";
process.env.COOKIE_EXPIRE = "1";
process.env.FRONTEND_ADMIN = "http://localhost:5173";
process.env.FRONTEND_PATIENT = "http://localhost:5174";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";

// ---- Replace the app's own database connection with a do-nothing fake ----
vi.mock("../database/dbConnection.js", () => ({
  dbConnection: vi.fn(),
  default: vi.fn(),
}));

let mongod;   // the in-memory server (dummy mode only)
let dbName;   // the temporary database name (real mode only)

// Runs ONCE before the tests in a file.
beforeAll(async () => {
  if (REAL_MODE) {
    // A new database name per run, always starting with "test_".
    dbName = `test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    await mongoose.connect(realUri, { dbName });
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
});

// Runs after EVERY test: empty all collections (in the temporary database only).
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Runs ONCE at the end.
afterAll(async () => {
  if (REAL_MODE) {
    // Guard: only ever drop a database that this run created.
    if (dbName && dbName.startsWith("test_")) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  } else {
    await mongoose.disconnect();
    await mongod.stop();
  }
});