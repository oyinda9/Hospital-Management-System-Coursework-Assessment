// Registration input validation.
// Techniques: boundary value analysis and equivalence partitioning.
// Each row is [label, field, value, should the registration be accepted?].
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/userSchema.js";
import { userData } from "./helpers.js";

const register = (body) =>
  request(app).post("/api/v1/user/patient/register").send(body);

const cases = [
  ["phone with 9 digits", "phone", "012345678", false],
  ["phone with 10 digits", "phone", "0123456789", true],
  ["phone with 11 digits", "phone", "01234567890", false],
  ["aadhar with 11 digits", "aadhar", "12345678901", false],
  ["aadhar with 12 digits", "aadhar", "123456789012", true],
  ["aadhar with 13 digits", "aadhar", "1234567890123", false],
  ["password with 7 characters", "password", "1234567", false],
  ["password with 8 characters", "password", "12345678", true],
  ["first name with 2 characters", "firstName", "Jo", false],
  ["first name with 3 characters", "firstName", "Joe", true],
  ["last name with 1 character", "lastName", "X", false],
  ["last name with 2 characters", "lastName", "Xu", true],
  ["email without @", "email", "not-an-email", false],
  ["valid short email", "email", "a@b.co", true],
  ["gender outside the allowed list", "gender", "Unknown", false],
  ["gender 'Others'", "gender", "Others", true],
  ["date of birth that is not a date", "dob", "not-a-date", false],
];

describe("registration boundary values", () => {
  it.each(cases)("%s", async (_label, field, value, accepted) => {
    const body = userData({ [field]: value });
    const res = await register(body);
    const stored = await User.findOne({ email: body.email });
    if (accepted) {
      expect(res.status).toBe(200);
      expect(stored).not.toBeNull();
    } else {
      expect(res.status).not.toBe(200); // invalid data must not be accepted...
      expect(stored).toBeNull();        // ...or saved
    }
  });
});

describe("registration required fields", () => {
  const required = ["firstName", "lastName", "email", "phone", "password", "gender", "aadhar", "dob"];
  it.each(required)("rejects the form when %s is missing", async (field) => {
    const body = userData();
    delete body[field];
    expect((await register(body)).status).toBe(400);
  });
});

describe("registration error handling and uniqueness", () => {
  // A mistake by the user is a client error (4xx), not a server fault (5xx).
  it("reports an invalid phone number as a client error, not a server error", async () => {
    const res = await register(userData({ phone: "123" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects a second registration with the same email", async () => {
    const body = userData();
    expect((await register(body)).status).toBe(200);
    expect((await register(body)).status).toBe(400);
  });

  // Race condition: the code checks for an existing email and then creates the user.
  // With no unique index in the database, simultaneous requests can both pass the check.
  it("creates only one account when the same email registers at the same moment", async () => {
    const body = userData();
    await Promise.all(Array.from({ length: 10 }, () => register(body)));
    expect(await User.countDocuments({ email: body.email })).toBe(1);
  });
});