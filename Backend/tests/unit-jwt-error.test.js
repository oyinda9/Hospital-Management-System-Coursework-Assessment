// UNIT tests: each function is tested alone, with fake request/response objects.
import { describe, it, expect, afterEach } from "vitest";
import { generateToken } from "../utils/jwtToken.js";
import ErrorHandler, { errorMiddleware } from "../middlewares/errorMiddleware.js";

// A fake Express response that records what the code under test does with it.
function fakeRes() {
  const res = { statusCode: null, cookieName: null, cookieValue: null, cookieOptions: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.cookie = (name, value, options) => { res.cookieName = name; res.cookieValue = value; res.cookieOptions = options; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

// A fake user document with only what generateToken needs.
function fakeUser(role) {
  return {
    role,
    generateJsonWebToken: () => "signed-token-value",
    toObject: () => ({ _id: "u1", email: "a@example.com", role, password: "$2b$10$hashhashhash" }),
  };
}

describe("generateToken (D3, D10)", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = originalEnv; });

  it.each([
    ["Admin", "adminToken"],
    ["Patient", "patientToken"],
    ["Doctor", "patientToken"],
  ])("a %s login sets the cookie %s", (role, cookie) => {
    const res = fakeRes();
    generateToken(fakeUser(role), "ok", 200, res);
    expect(res.cookieName).toBe(cookie);
    expect(res.cookieValue).toBe("signed-token-value");
    expect(res.statusCode).toBe(200);
  });

  it("makes the cookie HttpOnly so page scripts cannot read it", () => {
    const res = fakeRes();
    generateToken(fakeUser("Patient"), "ok", 200, res);
    expect(res.cookieOptions.httpOnly).toBe(true);
  });

  it.each([
    ["production", true],
    ["development", false],
    ["test", false],
  ])("sets the Secure flag only in production (NODE_ENV=%s -> %s)", (env, expected) => {
    process.env.NODE_ENV = env;
    const res = fakeRes();
    generateToken(fakeUser("Patient"), "ok", 200, res);
    expect(res.cookieOptions.secure).toBe(expected);
  });

  it("sets the cookie to expire about COOKIE_EXPIRE days from now", () => {
    const res = fakeRes();
    const before = Date.now();
    generateToken(fakeUser("Patient"), "ok", 200, res);
    const oneDay = 24 * 60 * 60 * 1000; // COOKIE_EXPIRE is "1" in tests/setup.js
    const delta = res.cookieOptions.expires.getTime() - before;
    expect(delta).toBeGreaterThan(oneDay - 5000);
    expect(delta).toBeLessThan(oneDay + 5000);
  });

  it("never puts the password hash or the token in the JSON body", () => {
    const res = fakeRes();
    generateToken(fakeUser("Patient"), "Logged in", 200, res);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Logged in");
    expect(res.body.user.email).toBe("a@example.com");
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("token");
    expect(JSON.stringify(res.body)).not.toContain("signed-token-value");
    expect(JSON.stringify(res.body)).not.toContain("hashhashhash");
  });
});

describe("errorMiddleware (D11 and error mapping)", () => {
  // Runs the middleware with a fake response and returns { status, message }.
  function run(err) {
    const res = fakeRes();
    errorMiddleware(err, {}, res, () => {});
    return { status: res.statusCode, message: res.body.message, success: res.body.success };
  }
  const named = (name, extra = {}) => Object.assign(new Error("original"), { name, ...extra });

  it.each([
    ["an ErrorHandler keeps its own status and message", new ErrorHandler("Not found", 404), 404, "Not found"],
    ["an unknown error becomes 500", new Error("boom"), 500, "boom"],
    ["a duplicate key (11000) becomes 400", named("MongoServerError", { code: 11000, keyValue: { email: "a@b.c" } }), 400, "Duplicate email Entered"],
    ["an invalid JWT becomes 400", named("JsonWebTokenError"), 400, "Json Web Token is invalid, Try Again!"],
    ["an expired JWT becomes 400", named("TokenExpiredError"), 400, "Json Web Token is Expired, Try Again!"],
    ["a CastError (bad id) becomes 400", named("CastError", { path: "_id" }), 400, "Invalid _id"],
  ])("%s", (_label, err, status, message) => {
    const out = run(err);
    expect(out.status).toBe(status);
    expect(out.message).toBe(message);
    expect(out.success).toBe(false);
  });

  it("D11: a ValidationError is a client error (400) and joins all messages", () => {
    const err = named("ValidationError", {
      errors: { phone: { message: "Phone number must contain exact 10 digits!" }, email: { message: "Please provide a valid Email!" } },
    });
    const out = run(err);
    expect(out.status).toBe(400);
    expect(out.message).toBe("Phone number must contain exact 10 digits! Please provide a valid Email!");
  });

  it("control: an error with no message still returns a safe default message", () => {
    const out = run(new ErrorHandler("", undefined));
    expect(out.status).toBe(500);
    expect(out.message).toBe("Internal Server Error");
  });
});