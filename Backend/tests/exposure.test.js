// Data exposure: D2 (public doctors endpoint), D10 (password hash) and D3 (token in the body).
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { User } from "../models/userSchema.js";
import { userData } from "./helpers.js";

describe("D2 - public doctors endpoint", () => {
  beforeEach(async () => {
    await User.create(
      userData({ role: "Doctor", firstName: "Gregory", lastName: "House", doctrDptmnt: "Cardiology" })
    );
  });

  // Control: the public list still shows what patients need.
  it("still shows the doctor's name and department (control)", async () => {
    const res = await request(app).get("/api/v1/user/doctors");
    expect(res.status).toBe(200);
    expect(res.body.doctors[0].firstName).toBe("Gregory");
    expect(res.body.doctors[0].doctrDptmnt).toBe("Cardiology");
  });

  it.each(["email", "phone", "aadhar", "dob"])("does not expose the doctor's %s", async (field) => {
    const res = await request(app).get("/api/v1/user/doctors");
    expect(res.body.doctors[0]).not.toHaveProperty(field);
  });
});

describe("D10 and D3 - authentication responses", () => {
  const login = async () => {
    const data = userData();
    await User.create(data);
    return request(app).post("/api/v1/user/login").send({
      email: data.email,
      password: data.password,
      confirmPassword: data.password,
      role: "Patient",
    });
  };

  it("registration response does not contain the password hash", async () => {
    const res = await request(app).post("/api/v1/user/patient/register").send(userData());
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("login response does not contain the password hash", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("login response does not return the JWT in the JSON body", async () => {
    const res = await login();
    expect(res.body).not.toHaveProperty("token");
  });

  // Control: the cookie is still HttpOnly, so scripts in the browser cannot read it.
  it("sets the auth cookie as HttpOnly (control)", async () => {
    const res = await login();
    expect(res.headers["set-cookie"].join(";")).toMatch(/HttpOnly/i);
  });
});