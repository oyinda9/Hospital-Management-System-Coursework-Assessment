import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { toast } from "react-toastify";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppointmentForm from "./AppointmentForm";

vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const doctors = [
  { _id: "1", firstName: "Mary", lastName: "Jones", doctrDptmnt: "Pediatrics" },
  { _id: "2", firstName: "dummy ", lastName: "doctor", doctrDptmnt: "Neurology" },
];

const selects = () => screen.getAllByRole("combobox");

async function renderForm() {
  axios.get.mockResolvedValue({ data: { doctors } });
  render(<AppointmentForm />);
  await waitFor(() => expect(axios.get).toHaveBeenCalled());
}

async function chooseNeurologyDoctor() {
  fireEvent.change(selects()[1], { target: { value: "Neurology" } });
  const option = await screen.findByRole("option", { name: /dummy\s+doctor/ });
  fireEvent.change(selects()[2], { target: { value: option.value } });
}

describe("Patient appointment form", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only the doctors of the selected department (control test)", async () => {
    await renderForm();
    expect(
      await screen.findByRole("option", { name: "Mary Jones" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /dummy/ })).not.toBeInTheDocument();

    fireEvent.change(selects()[1], { target: { value: "Neurology" } });
    expect(
      await screen.findByRole("option", { name: /dummy\s+doctor/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Mary Jones" })
    ).not.toBeInTheDocument();
  });

  it("D16: sends the doctor's first and last name exactly as stored", async () => {
    axios.post.mockResolvedValue({ data: { message: "Appointment booked" } });
    await renderForm();
    await chooseNeurologyDoctor();
    fireEvent.click(screen.getByRole("button", { name: "Get Appointment" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const body = axios.post.mock.calls[0][1];
    expect(body.doctor_firstName).toBe("dummy ");
    expect(body.doctor_lastName).toBe("doctor");
  });

  it("D17: shows a fallback message when the server cannot be reached", async () => {
    axios.post.mockRejectedValue(new Error("Network Error"));
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Get Appointment" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong. Please try again."
      )
    );
  });
});
