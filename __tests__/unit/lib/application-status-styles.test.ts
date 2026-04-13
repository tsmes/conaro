import { describe, it, expect } from "vitest";
import {
  STATUS_STYLES,
  styleForStatus,
} from "@/lib/applications/status-styles";

describe("STATUS_STYLES", () => {
  it("maps each application status to a label and variant", () => {
    expect(STATUS_STYLES.submitted).toEqual({
      label: "Submitted",
      variant: "default",
    });
    expect(STATUS_STYLES.under_review).toEqual({
      label: "Under Review",
      variant: "secondary",
    });
    expect(STATUS_STYLES.accepted).toEqual({
      label: "Accepted",
      variant: "success",
    });
    expect(STATUS_STYLES.rejected).toEqual({
      label: "Rejected",
      variant: "destructive",
    });
    expect(STATUS_STYLES.revoked).toEqual({
      label: "Revoked",
      variant: "destructive",
    });
  });
});

describe("styleForStatus", () => {
  it("returns the mapped style for a known status", () => {
    expect(styleForStatus("accepted")).toEqual({
      label: "Accepted",
      variant: "success",
    });
  });

  it("falls back to secondary variant for an unknown status", () => {
    expect(styleForStatus("frobnicated")).toEqual({
      label: "frobnicated",
      variant: "secondary",
    });
  });
});
