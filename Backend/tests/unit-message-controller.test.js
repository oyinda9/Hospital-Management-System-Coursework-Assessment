
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/messageSchema.js", () => ({
  Message: {
    create: vi.fn(),
    find: vi.fn(),
  },
}));

import { Message } from "../models/messageSchema.js";
import {
  sendMessage,
  getAllMessages,
} from "../controller/messageController.js";

const validMessage = {
  firstName: "Ada",
  lastName: "Obi",
  email: "ada@test.com",
  phone: "0123456789",
  message: "I need an appointment.",
};

const createMockResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

const executeController = (controller, body = {}) => {
  const req = { body };
  const res = createMockResponse();
  const next = vi.fn();

  controller(req, res, next);

  return { req, res, next };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendMessage Controller", () => {
  it.each([
    "firstName",
    "lastName",
    "email",
    "phone",
    "message",
  ])("should reject the request when %s is missing", (field) => {
    const { next } = executeController(sendMessage, {
      ...validMessage,
      [field]: "",
    });

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Please Fill Full Form",
      })
    );

    expect(Message.create).not.toHaveBeenCalled();
  });

  it("should save a valid message successfully", async () => {
    Message.create.mockResolvedValue({});

    const { res } = executeController(sendMessage, validMessage);

    await vi.waitFor(() => {
      expect(res.json).toHaveBeenCalled();
    });

    expect(Message.create).toHaveBeenCalledWith(validMessage);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Message Send Successfully!",
    });
  });

  it("should ignore additional fields when saving a message", async () => {
    Message.create.mockResolvedValue({});

    executeController(sendMessage, {
      ...validMessage,
      isAdmin: true,
    });

    await vi.waitFor(() => {
      expect(Message.create).toHaveBeenCalled();
    });

    expect(Message.create).toHaveBeenCalledWith(validMessage);
  });

  it("should forward database errors to the error handler", async () => {
    const error = new Error("database down");
    Message.create.mockRejectedValue(error);

    const { res, next } = executeController(
      sendMessage,
      validMessage
    );

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledWith(error);
    });

    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("getAllMessages Controller", () => {
  it("should return all messages successfully", async () => {
    const messages = [
      { firstName: "Ada" },
      { firstName: "Tom" },
    ];

    Message.find.mockResolvedValue(messages);

    const { res } = executeController(getAllMessages);

    await vi.waitFor(() => {
      expect(res.json).toHaveBeenCalled();
    });

    expect(Message.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      messages,
    });
  });

  it("should forward database errors to the error handler", async () => {
    const error = new Error("database down");
    Message.find.mockRejectedValue(error);

    const { next } = executeController(getAllMessages);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
