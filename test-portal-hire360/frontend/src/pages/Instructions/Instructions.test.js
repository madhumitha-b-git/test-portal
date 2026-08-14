import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Instructions from "./Instructions";
import { fetchQuestions } from "../../services/api";

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock Navbar and Footer to avoid rendering complexity
jest.mock("../../components/Navbar", () => () => <div data-testid="navbar">Navbar</div>);
jest.mock("../../components/Footer", () => () => <div data-testid="footer">Footer</div>);

// Mock the API service
jest.mock("../../services/api", () => ({
  fetchQuestions: jest.fn(),
}));

describe("Instructions Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Default API mock return
    fetchQuestions.mockResolvedValue({
      data: {
        questions: [],
        testId: "BIT-2026-TEST",
        totalDurationMinutes: 30,
        title: "BIT 2026 Test"
      }
    });
  });

  test("renders correctly and checkbox toggles start button state", async () => {
    render(<Instructions />);

    // Wait for the async API call state update to finish
    await screen.findByText(/30 Minutes/i);

    // Verify loading of static content
    expect(screen.getByText(/Hire360 Examination Instructions/i)).toBeInTheDocument();
    
    // Find the Begin Assessment button
    const startButton = screen.getByRole("button", { name: /Begin Assessment/i });
    expect(startButton).toBeInTheDocument();
    expect(startButton).toBeDisabled();

    // Find the acceptance checkbox
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(false);

    // Click checkbox to accept rules
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // The button should now be enabled
    expect(startButton).toBeEnabled();

    // Click checkbox again to reject rules
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(startButton).toBeDisabled();
  });

  test("navigates to /test when clicking Begin Assessment after accepting", async () => {
    render(<Instructions />);

    // Wait for the async API call state update to finish
    await screen.findByText(/30 Minutes/i);

    const checkbox = screen.getByRole("checkbox");
    const startButton = screen.getByRole("button", { name: /Begin Assessment/i });

    // Enable the start button and click it
    fireEvent.click(checkbox);
    fireEvent.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith("/test");
  });
});
