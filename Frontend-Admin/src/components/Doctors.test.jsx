import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Doctors from "./Doctors";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));
vi.mock("../main", async () => {
  const React = await import("react");
  return { Context: React.createContext({ isAuthenticated: true }) };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <Doctors />
    </MemoryRouter>
  );

describe("Admin Doctors page (regression after the D2 fix)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the admin-only doctors endpoint", async () => {
    axios.get.mockResolvedValue({ data: { doctors: [] } });
    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(axios.get.mock.calls[0][0]).toBe(
      "http://localhost:4000/api/v1/user/admin/doctors"
    );
  });

  it("shows a doctor's full details (control test)", async () => {
    axios.get.mockResolvedValue({
      data: {
        doctors: [
          { firstName: "Ada", lastName: "Obi", email: "ada@test.com", dob: "1980-05-01T00:00:00.000Z" },
        ],
      },
    });
    renderPage();
    expect(await screen.findByText("Ada Obi")).toBeInTheDocument();
    expect(screen.getByText("1980-05-01")).toBeInTheDocument();
  });

  it("does not crash when a doctor record has no date of birth", async () => {
    axios.get.mockResolvedValue({
      data: { doctors: [{ firstName: "Ada", lastName: "Obi" }] },
    });
    renderPage();
    expect(await screen.findByText("Ada Obi")).toBeInTheDocument();
  });
});