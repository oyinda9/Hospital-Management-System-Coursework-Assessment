// Access-control matrix: every protected route is tried by every kind of caller.
// Technique: table-driven security testing. A caller who should not get in
// must be refused with a client error (4xx), never allowed (2xx) and never crash the server (5xx).
import { describe, it, expect } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { User } from "../models/userSchema.js";
import { loggedInAgent } from "./helpers.js";

const anId = () => new mongoose.Types.ObjectId().toString();

// [HTTP method, path, role that is allowed]
const routes = [
  ["post", "/api/v1/user/admin/addnew", "Admin"],
  ["get", "/api/v1/user/admin/me", "Admin"],
  ["get", "/api/v1/user/admin/logout", "Admin"],
  ["post", "/api/v1/user/doctor/addnew", "Admin"],
  ["get", "/api/v1/appointment/getall", "Admin"],
  ["put", `/api/v1/appointment/update/${anId()}`, "Admin"],
  ["delete", `/api/v1/appointment/delete/${anId()}`, "Admin"],
  ["get", "/api/v1/user/patient/me", "Patient"],
  ["get", "/api/v1/user/patient/logout", "Patient"],
  ["post", "/api/v1/appointment/post", "Patient"],
];
const adminRoutes = routes.filter((r) => r[2] === "Admin");
const patientRoutes = routes.filter((r) => r[2] === "Patient");

const expectRefused = (res) => {
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect(res.status).toBeLessThan(500);
};

describe("anonymous callers", () => {
  it.each(routes)("%s %s is refused without a login", async (method, path) => {
    expectRefused(await request(app)[method](path).send({}));
  });
});

describe.each(["Patient", "Doctor"])("a logged-in %s on admin-only routes", (actor) => {
  it.each(adminRoutes)("%s %s is refused", async (method, path) => {
    const { agent } = await loggedInAgent(actor);
    expectRefused(await agent[method](path).send({}));
  });
});

describe.each(["Admin", "Doctor"])("a logged-in %s on patient-only routes", (actor) => {
  it.each(patientRoutes)("%s %s is refused", async (method, path) => {
    const { agent } = await loggedInAgent(actor);
    expectRefused(await agent[method](path).send({}));
  });
});

describe("authentication edge cases", () => {
  // Control: the right role is let in, so the refusals above are meaningful.
  it("lets each role use its own routes (control)", async () => {
    const admin = await loggedInAgent("Admin");
    expect((await admin.agent.get("/api/v1/user/admin/me")).status).toBe(200);
    expect((await admin.agent.get("/api/v1/appointment/getall")).status).toBe(200);
    const patient = await loggedInAgent("Patient");
    expect((await patient.agent.get("/api/v1/user/patient/me")).status).toBe(200);
  });

  it("refuses a patient's valid token sent in the admin cookie (403)", async () => {
    const { user } = await loggedInAgent("Patient");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });
    const res = await request(app)
      .get("/api/v1/user/admin/me")
      .set("Cookie", [`adminToken=${token}`]);
    expect(res.status).toBe(403);
  });

  it("refuses a malformed token without crashing", async () => {
    const res = await request(app)
      .get("/api/v1/user/admin/me")
      .set("Cookie", ["adminToken=not-a-real-jwt"]);
    expectRefused(res);
  });

  // A valid token for an account that no longer exists must be refused, not crash the server.
  it("refuses a valid token whose user has been deleted", async () => {
    const { agent } = await loggedInAgent("Patient");
    await User.deleteMany({});
    const res = await agent.get("/api/v1/user/patient/me");
    expectRefused(res);
  });
});