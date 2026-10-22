import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/userSchema.js";
import { userData, loggedInAgent } from "./helpers.js";

const ADMIN_DOCTORS = "/api/v1/user/admin/doctors";

describe("D2 - admin-only doctors endpoint", () => {
  beforeEach(async () => {
    await User.create(
      userData({ role: "Doctor", firstName: "Gregory", lastName: "House", doctrDptmnt: "Cardiology" })
    );
  });

  it("refuses a request with no login", async () => {
    const res = await request(app).get(ADMIN_DOCTORS);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("refuses a logged-in patient", async () => {
    const { agent } = await loggedInAgent("Patient");
    const res = await agent.get(ADMIN_DOCTORS);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("gives a logged-in admin the full doctor details but never the password hash (control)", async () => {
    const { agent } = await loggedInAgent("Admin");
    const res = await agent.get(ADMIN_DOCTORS);
    expect(res.status).toBe(200);
    const doctor = res.body.doctors[0];
    expect(doctor.firstName).toBe("Gregory");
    for (const field of ["email", "phone", "aadhar", "dob"]) {
      expect(doctor).toHaveProperty(field);
    }
    expect(doctor).not.toHaveProperty("password");
  });
});