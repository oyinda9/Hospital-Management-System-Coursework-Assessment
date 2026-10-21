 
import { describe, it, expect } from "vitest";
import request from "supertest"; 
import app from "../app.js";      
 
describe("smoke test", () => {
 
  it("lists doctors on the public endpoint", async () => {
    
    const res = await request(app).get("/api/v1/user/doctors");
 
    expect(res.status).toBe(200);
  });
});