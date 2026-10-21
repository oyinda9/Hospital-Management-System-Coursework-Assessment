// Shared helpers for the test files.
import request from "supertest";
import app from "../app.js";
import { User } from "../models/userSchema.js";

let counter = 0;

// Builds valid dummy user data. Every call gets a unique email.
export const userData = (overrides = {}) => {
  counter += 1;
  return {
    firstName: "Test",
    lastName: "User",
    email: `user${counter}@example.com`,
    phone: "0123456789",   // exactly 10 digits (schema rule)
    password: "Password123",
    gender: "Male",
    aadhar: "123456789012", // exactly 12 digits (schema rule)
    dob: "1990-01-01",
    role: "Patient",
    ...overrides,
  };
};
 
export async function loggedInAgent(role = "Patient", overrides = {}) {
  const data = userData({ role, ...overrides });
  const user = await User.create(data);
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/user/login").send({
    email: data.email,
    password: data.password,
    confirmPassword: data.password,
    role,
  });
  if (res.status !== 200) {
    throw new Error(`Helper could not log in as ${role}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { agent, user, data };
}