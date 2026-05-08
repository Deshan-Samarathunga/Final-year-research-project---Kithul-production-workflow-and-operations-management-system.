import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("API validation and auth boundaries", () => {
  const app = createApp();

  it("reports healthy status without authentication", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("blocks protected employee routes without a session", async () => {
    const response = await request(app).get("/api/employees");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  it("validates login payloads", async () => {
    const response = await request(app).post("/api/auth/login").send({ userId: "", password: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });
});
