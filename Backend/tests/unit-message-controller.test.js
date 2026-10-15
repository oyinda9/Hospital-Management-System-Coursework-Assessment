// UNIT tests for the message controller, with the Message model replaced by a fake.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/messageSchema.js", () => ({
  Message: { create: vi.fn(), find: vi.fn() },
}));

import { Message } from "../models/messageSchema.js";
import { sendMessage, getAllMessages } from "../controller/messageController.js";

const validBody = {
  firstName: "Ada",
  lastName: "Obi",
  email: "ada@test.com",
  phone: "0123456789",
  message: "I need an appointment.",
};

function fakeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// Runs a handler with a fake request and returns what it did.
function run(handler, body = {}) {
  const req = { body };
  const res = fakeRes();
  const next = vi.fn();
  handler(req, res, next);
  return { res, next };
}

beforeEach(() => {
  Message.create.mockReset();
  Message.find.mockReset();
});

describe("sendMessage", () => {
  it.each(["firstName", "lastName", "email", "phone", "message"])(
    "refuses the form with 400 when %s is missing, without saving anything",
    (field) => {
      const { next } = run(sendMessage, { ...validBody, [field]: "" });
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Please Fill Full Form");
      expect(Message.create).not.toHaveBeenCalled();
    }
  );

  it("saves a complete form and answers 200", async () => {
    Message.create.mockResolvedValue({});
    const { res } = run(sendMessage, validBody);
    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());
    expect(Message.create).toHaveBeenCalledWith(validBody);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Message Send Successfully!",
    });
  });

  it("stores only the five known fields and ignores extra ones", async () => {
    Message.create.mockResolvedValue({});
    const { res } = run(sendMessage, { ...validBody, isAdmin: true });
    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());
    expect(Message.create).toHaveBeenCalledWith(validBody);
  });

  it("passes a database error on to the error handler", async () => {
    const dbError = new Error("database down");
    Message.create.mockRejectedValue(dbError);
    const { res, next } = run(sendMessage, validBody);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(dbError));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("getAllMessages", () => {
  it("returns every message with status 200", async () => {
    const messages = [{ firstName: "Ada" }, { firstName: "Tom" }];
    Message.find.mockResolvedValue(messages);
    const { res } = run(getAllMessages);
    await vi.waitFor(() => expect(res.json).toHaveBeenCalled());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, messages });
  });

  it("passes a database error on to the error handler", async () => {
    const dbError = new Error("database down");
    Message.find.mockRejectedValue(dbError);
    const { next } = run(getAllMessages);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(dbError));
  });
});