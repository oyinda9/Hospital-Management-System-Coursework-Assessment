import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const mongod = await MongoMemoryServer.create();

process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET_KEY = "e2e-secret";
process.env.JWT_EXPIRES = "1d";
process.env.COOKIE_EXPIRE = "1";
process.env.FRONTEND_ADMIN = "http://localhost:5173";
process.env.FRONTEND_PATIENT = "http://localhost:5174";
process.env.PORT = "4000";

const { default: app } = await import("../app.js");
const { User } = await import("../models/userSchema.js");

while (mongoose.connection.readyState !== 1) {
  await new Promise((r) => setTimeout(r, 100));
}
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

const person = {
  phone: "0123456789",
  aadhar: "123456789012",
  dob: "1985-05-05",
  gender: "Others",
};
await User.create({
  ...person,
  firstName: "Site",
  lastName: "Admin",
  email: "admin@e2e.test",
  password: "AdminPass123",
  role: "Admin",
});
await User.create({
  ...person,
  firstName: "Gregory",
  lastName: "Lane",
  email: "doctor@e2e.test",
  password: "DoctorPass123",
  role: "Doctor",
  doctrDptmnt: "Cardiology",
});

app.listen(process.env.PORT, () =>
  console.log("E2E backend ready on port 4000"),
);
