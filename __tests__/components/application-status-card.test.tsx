import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ApplicationStatusCard } from "@/components/events/application-status-card";

describe("ApplicationStatusCard", () => {
  it("renders the celebratory header for accepted applicants", () => {
    render(
      <ApplicationStatusCard status="accepted" responseMessage={null} />
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "You're in"
    );
    expect(
      screen.getByText(/your application has been accepted/i)
    ).toBeInTheDocument();
  });

  it("renders the neutral results header for rejected applicants", () => {
    render(
      <ApplicationStatusCard status="rejected" responseMessage={null} />
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Results"
    );
    expect(
      screen.getByText(/can't offer you a spot/i)
    ).toBeInTheDocument();
  });

  it("renders the waitlist header and shows the original organizer message", () => {
    render(
      <ApplicationStatusCard
        status="waitlisted"
        responseMessage="Thanks but no thanks for now."
      />
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "You're on the waitlist"
    );
    expect(
      screen.getByText(/original message from organizer/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/thanks but no thanks for now/i)
    ).toBeInTheDocument();
  });

  it("falls back to the default header for in-flight statuses", () => {
    render(
      <ApplicationStatusCard status="under_review" responseMessage={null} />
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Your application"
    );
  });

  it("renders trailing children below the message body", () => {
    render(
      <ApplicationStatusCard status="accepted" responseMessage={null}>
        <span data-testid="trailing">trailing slot</span>
      </ApplicationStatusCard>
    );
    expect(screen.getByTestId("trailing")).toHaveTextContent("trailing slot");
  });
});
