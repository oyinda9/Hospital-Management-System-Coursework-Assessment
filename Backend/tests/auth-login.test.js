 
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

const patient = {
  firstName: "Test",
  lastName: "Patient",
  email: "login.test@example.com",
  phone: "0123456789",
  password: "Password123",
  gender: "Male",
  aadhar: "123456789012",
  dob: "1990-01-01",
};

describe("login", () => {
  it("logs in a registered patient with the correct role", async () => {
    await request(app).post("/api/v1/user/patient/register").send(patient);

    const res = await request(app).post("/api/v1/user/login").send({
      email: patient.email,
      password: patient.password,
      confirmPassword: patient.password,
      role: "Patient",
    });

    expect(res.status).toBe(200);
  });

  it("refuses login when the role does not match the account", async () => {
    await request(app).post("/api/v1/user/patient/register").send(patient);

    const res = await request(app).post("/api/v1/user/login").send({
      email: patient.email,
      password: patient.password,
      confirmPassword: patient.password,
      role: "Admin",
    });

    expect(res.status).toBe(400);
  });
});