// Appointment tests  booking rules (D9, D14), admin update (D5) and a full workflow.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { User } from "../models/userSchema.js";
import { Appointment } from "../models/appointmentSchema.js";
import { userData, loggedInAgent } from "./helpers.js";

const POST = "/api/v1/appointment/post";

let doctor;
beforeEach(async () => {
  doctor = await User.create(
    userData({ role: "Doctor", firstName: "Gregory", lastName: "House", doctrDptmnt: "Cardiology" })
  );
});

// Valid dummy booking data. The appointment date is in the future.
const booking = (overrides = {}) => ({
  firstName: "Pat",
  lastName: "Ient",
  email: "pat@example.com",
  phone: "0123456789",
  aadhar: "123456789012",
  dob: "1990-01-01",
  gender: "Male",
  appointment_date: "2030-01-15",
  department: "Cardiology",
  doctor_firstName: "Gregory",
  doctor_lastName: "House",
  address: "1 Test Street",
  ...overrides,
});

const expectRefused = (res) => {
  expect(res.status).toBeGreaterThanOrEqual(400);
  expect(res.status).toBeLessThan(500);
};

describe("booking an appointment", () => {
  it("books an appointment and takes the patient from the session (control)", async () => {
    const { agent, user } = await loggedInAgent("Patient");
    const res = await agent.post(POST).send(booking());
    expect(res.status).toBe(200);
    const saved = await Appointment.findOne({});
    expect(saved.status).toBe("Pending");
    expect(saved.patientId.toString()).toBe(user._id.toString());
    expect(saved.doctorId.toString()).toBe(doctor._id.toString());
  });

  // Reviewed during D4 analysis: a forged patientId in the request body must be ignored.
  it("ignores a patientId sent in the request body", async () => {
    const { agent, user } = await loggedInAgent("Patient");
    const fake = new mongoose.Types.ObjectId().toString();
    await agent.post(POST).send(booking({ patientId: fake }));
    const saved = await Appointment.findOne({});
    expect(saved.patientId.toString()).toBe(user._id.toString());
  });

  it("returns 404 for a doctor that does not exist", async () => {
    const { agent } = await loggedInAgent("Patient");
    const res = await agent.post(POST).send(booking({ doctor_lastName: "Nobody" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when a required field is missing", async () => {
    const { agent } = await loggedInAgent("Patient");
    const body = booking();
    delete body.address;
    expect((await agent.post(POST).send(body)).status).toBe(400);
  });
});

describe("D9 - duplicate appointment requests", () => {
  it("refuses the same patient booking the same doctor and date twice", async () => {
    const { agent } = await loggedInAgent("Patient");
    expect((await agent.post(POST).send(booking())).status).toBe(200);
    expectRefused(await agent.post(POST).send(booking()));
    expect(await Appointment.countDocuments({})).toBe(1);
  });

  it("creates one appointment when the same request arrives 10 times at once", async () => {
    const { agent } = await loggedInAgent("Patient");
    await Promise.all(Array.from({ length: 10 }, () => agent.post(POST).send(booking())));
    expect(await Appointment.countDocuments({})).toBe(1);
  });
});

describe("D14 - appointment date validation", () => {
  it.each(["not-a-date", "2000-01-01"])("refuses the appointment date '%s'", async (date) => {
    const { agent } = await loggedInAgent("Patient");
    expectRefused(await agent.post(POST).send(booking({ appointment_date: date })));
    expect(await Appointment.countDocuments({})).toBe(0);
  });
});

describe("D5 - admin appointment update", () => {
  const makeAppointment = async () => {
    const patient = await loggedInAgent("Patient");
    await patient.agent.post(POST).send(booking());
    return Appointment.findOne({});
  };

  it("changes the status (control)", async () => {
    const appt = await makeAppointment();
    const admin = await loggedInAgent("Admin");
    const res = await admin.agent.put(`/api/v1/appointment/update/${appt._id}`).send({ status: "Accepted" });
    expect(res.status).toBe(200);
    expect((await Appointment.findById(appt._id)).status).toBe("Accepted");
  });

  it("ignores every field except the status", async () => {
    const appt = await makeAppointment();
    const admin = await loggedInAgent("Admin");
    const otherDoctor = new mongoose.Types.ObjectId().toString();
    await admin.agent
      .put(`/api/v1/appointment/update/${appt._id}`)
      .send({ status: "Accepted", firstName: "Hacked", doctorId: otherDoctor });
    const after = await Appointment.findById(appt._id);
    expect(after.status).toBe("Accepted");
    expect(after.firstName).toBe("Pat");
    expect(after.doctorId.toString()).toBe(doctor._id.toString());
  });

  it("refuses an invalid status value with a client error", async () => {
    const appt = await makeAppointment();
    const admin = await loggedInAgent("Admin");
    const res = await admin.agent.put(`/api/v1/appointment/update/${appt._id}`).send({ status: "Banana" });
    expectRefused(res);
  });
});

describe("full workflow", () => {
  it("patient registers and books, admin sees it and accepts it", async () => {
    const patient = request.agent(app);
    expect((await patient.post("/api/v1/user/patient/register").send(userData())).status).toBe(200);
    expect((await patient.post(POST).send(booking())).status).toBe(200);

    const admin = await loggedInAgent("Admin");
    const list = await admin.agent.get("/api/v1/appointment/getall");
    expect(list.body.appointments).toHaveLength(1);
    expect(list.body.appointments[0].status).toBe("Pending");

    const id = list.body.appointments[0]._id;
    await admin.agent.put(`/api/v1/appointment/update/${id}`).send({ status: "Accepted" });
    const after = await admin.agent.get("/api/v1/appointment/getall");
    expect(after.body.appointments[0].status).toBe("Accepted");
  });
});