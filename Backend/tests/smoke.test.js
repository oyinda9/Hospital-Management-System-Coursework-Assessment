// Smoke test: the simplest check that the app starts and answers.
// If this passes, the test setup works.
import { describe, it, expect } from "vitest";
import request from "supertest"; // sends fake HTTP requests to the app
import app from "../app.js";     // the Express app (exported without calling listen)

// "describe" groups related tests under one label in the output.
describe("smoke test", () => {
  // "it" is a single test; the text is its name.
  it("lists doctors on the public endpoint", async () => {
    // Send a GET request to the app, as a browser would, without a real server.
    const res = await request(app).get("/api/v1/user/doctors");

    // The check: the test passes only if the status code is 200 (OK).
    expect(res.status).toBe(200);
  });
});