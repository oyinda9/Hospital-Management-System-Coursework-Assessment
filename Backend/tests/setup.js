 
import { vi, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "dotenv";
import { fileURLToPath } from "url";

const REAL_MODE = process.env.TEST_DB === "real";
 
let realUri;
if (REAL_MODE) {
  config({
    path: fileURLToPath(new URL("../config/config.env", import.meta.url)),
  });
  realUri = process.env.MONGO_URI;
  if (!realUri) throw new Error("MONGO_URI not found in config/config.env");
} 
process.env.MONGO_URI = "mongodb://127.0.0.1:1/never-used";
 
process.env.JWT_SECRET_KEY = "test-secret";
process.env.JWT_EXPIRES = "1d";
process.env.COOKIE_EXPIRE = "1";
process.env.FRONTEND_ADMIN = "http://localhost:5173";
process.env.FRONTEND_PATIENT = "http://localhost:5174";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";

 
vi.mock("../database/dbConnection.js", () => ({
  dbConnection: vi.fn(),
  default: vi.fn(),
}));

let mongod;  
let dbName;  

 
beforeAll(async () => {
  if (REAL_MODE) {
    
    dbName = `test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    await mongoose.connect(realUri, { dbName });
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
 
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

 
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Runs ONCE at the end.
afterAll(async () => {
  if (REAL_MODE) {
    
    if (dbName && dbName.startsWith("test_")) {
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
  } else {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
