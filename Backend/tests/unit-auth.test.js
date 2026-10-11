// UNIT tests for the authentication middleware, with the User model replaced by a fake.

import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../models/userSchema.js", () => ({ User: { findById: vi.fn() } }));

import { User } from "../models/userSchema.js";
import { isAdminAuthenticated, isPatientAuthenticated } from "../middlewares/auth.js";

const token = () => jwt.sign({ id: "user-1" }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });

// Runs a middleware with a fake request and returns what it passed to next().
async function run(middleware, cookies) {
  const req = { cookies };
  const next = vi.fn();
  await middleware(req, {}, next);
  return { req, next, arg: next.mock.calls[0]?.[0] };
}

describe.each([
  ["isAdminAuthenticated", isAdminAuthenticated, "adminToken", "Admin", "Patient"],
  ["isPatientAuthenticated", isPatientAuthenticated, "patientToken", "Patient", "Admin"],
])("%s", (_name, middleware, cookie, rightRole, wrongRole) => {
  beforeEach(() => { User.findById.mockReset(); });

  it("refuses a request with no cookie (400) without touching the database", async () => {
    const { arg } = await run(middleware, {});
    expect(arg.statusCode).toBe(400);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("passes a JWT error on for a token that is not valid", async () => {
    const { arg } = await run(middleware, { [cookie]: "not-a-real-token" });
    expect(arg.name).toBe("JsonWebTokenError");
  });

  it("D13: refuses a valid token whose account no longer exists (401)", async () => {
    User.findById.mockResolvedValue(null);
    const { arg } = await run(middleware, { [cookie]: token() });
    expect(arg.statusCode).toBe(401);
    expect(arg.message).toBe("User no longer exists!");
  });

  it("refuses a user with the wrong role (403)", async () => {
    User.findById.mockResolvedValue({ _id: "user-1", role: wrongRole });
    const { arg } = await run(middleware, { [cookie]: token() });
    expect(arg.statusCode).toBe(403);
  });

  it("control: lets the right role through and attaches the user", async () => {
    const user = { _id: "user-1", role: rightRole };
    User.findById.mockResolvedValue(user);
    const { req, next, arg } = await run(middleware, { [cookie]: token() });
    expect(arg).toBeUndefined(); // next() called with no error
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBe(user);
  });
});