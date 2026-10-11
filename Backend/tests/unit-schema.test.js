// UNIT tests for the user schema rules. validate() checks the rules in memory:

import { describe, it, expect } from "vitest";
import { User } from "../models/userSchema.js";

const valid = () => ({
  firstName: "Test", lastName: "User", email: "unit@example.com", phone: "0123456789",
  aadhar: "123456789012", dob: "1990-01-01", gender: "Male", password: "Password123", role: "Patient",
});

// Returns the validation error, or undefined when the data is valid.
const errorFor = async (overrides) => {
  try {
    await new User({ ...valid(), ...overrides }).validate();
  } catch (err) {
    return err;
  }
};

describe("user schema rules", () => {
  it("control: a fully valid user has no validation errors", async () => {
    expect(await errorFor({})).toBeUndefined();
  });

  it.each([
    ["phone", "012345678", false],   // 9 digits: just below the boundary
    ["phone", "0123456789", true],   // 10 digits: valid
    ["phone", "01234567890", false], // 11 digits: just above the boundary
    ["aadhar", "12345678901", false],
    ["aadhar", "123456789012", true],
    ["aadhar", "1234567890123", false],
    ["password", "1234567", false],  // 7 characters
    ["password", "12345678", true],  // 8 characters
    ["firstName", "Ab", false],
    ["firstName", "Abc", true],
    ["lastName", "A", false],
    ["lastName", "Ab", true],
  ])("%s = %j is accepted: %s", async (field, value, accepted) => {
    const err = await errorFor({ [field]: value });
    expect(err === undefined).toBe(accepted);
    if (!accepted) expect(err.errors[field]).toBeDefined();
  });

  it.each([
    ["gender", "Male", true], ["gender", "Female", true], ["gender", "Others", true], ["gender", "Other", false],
    ["role", "Admin", true], ["role", "Patient", true], ["role", "Doctor", true], ["role", "Superuser", false],
    ["email", "a@example.com", true], ["email", "not-an-email", false],
  ])("equivalence class: %s = %j is accepted: %s", async (field, value, accepted) => {
    expect((await errorFor({ [field]: value })) === undefined).toBe(accepted);
  });

  it.each(["firstName", "lastName", "email", "phone", "aadhar", "dob", "gender", "password", "role"])(
    "refuses a user with no %s",
    async (field) => {
      const err = await errorFor({ [field]: undefined });
      expect(err.errors[field]).toBeDefined();
    }
  );
});