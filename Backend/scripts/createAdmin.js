// this file helps creates the first Admin account in the database the app uses.
 
import dotenv from "dotenv";
import mongoose from "mongoose";
import { dbConnection } from "../database/dbConnection.js";
import { User } from "../models/userSchema.js";

dotenv.config({ path: "./config/config.env" });

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) before running.");
  process.exit(1);
}

await dbConnection();

const existing = await User.findOne({ email: ADMIN_EMAIL });
if (existing) {
  console.log("An account with that email already exists. Nothing was changed.");
} else {
  await User.create({
    firstName: "Site",
    lastName: "Admin",
    email: ADMIN_EMAIL,
    phone: "0123456789",
    aadhar: "123456789012",
    dob: "1990-01-01",
    gender: "Others",
    password: ADMIN_PASSWORD,
    role: "Admin",
  });
  console.log("Admin account created.");
}

await mongoose.disconnect();