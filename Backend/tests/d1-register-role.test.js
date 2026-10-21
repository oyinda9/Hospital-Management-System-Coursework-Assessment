// D1: public registration must not let a caller choose the Admin role.
 
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/userSchema.js";

// Dummy patient data. Only "role" and "email" change between tests.
const payload = (overrides = {}) => ({
  firstName: "Test",
  lastName: "Patient",
  email: "d1.test@example.com",
  phone: "0123456789",
  password: "Password123",
  gender: "Male",
  aadhar: "123456789012",
  dob: "1990-01-01",
  role: "Patient",
  ...overrides,
});

describe("D1 - public registration and roles", () => {
  
  it("registers a normal patient and stores the Patient role", async () => {
    const res = await request(app)
      .post("/api/v1/user/patient/register")
      .send(payload());
    // console.log("DEBUG register:", res.status, res.body);
    expect(res.status).toBe(200);

    const stored = await User.findOne({ email: "d1.test@example.com" });
    expect(stored.role).toBe("Patient");
  });

 
  it("does not create an Admin account from public registration", async () => {
    const res = await request(app)
      .post("/api/v1/user/patient/register")
      .send(payload({ email: "d1.admin@example.com", role: "Admin" }));

    // A server crash (500) must not count as a pass.
    expect(res.status).not.toBe(500);

    const stored = await User.findOne({ email: "d1.admin@example.com" });
    expect(stored?.role).not.toBe("Admin");
  });
});