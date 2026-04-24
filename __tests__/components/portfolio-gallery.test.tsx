import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";

// Mock the upload zone so we don't need to simulate file uploads.
vi.mock("@/components/profile/image-upload-zone", () => ({
  ImageUploadZone: () => <div data-testid="upload-zone" />,
}));

const baseImage = {
  id: "img-1",
  filename: "cat.webp",
  url: "https://cdn.test/cat.webp",
  width: 800,
  height: 600,
  caption: null as string | null,
};

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ success: true, caption: null }),
    })
  ) as unknown as typeof fetch;
});

describe("PortfolioGallery (allowCaption)", () => {
  it("renders a caption input per image when allowCaption is on", () => {
    render(
      <PortfolioGallery
        section="promo"
        images={[{ ...baseImage, caption: "Booth 2024" }]}
        totalCap={20}
        totalUsed={0}
        allowCaption
      />
    );
    const captionInput = screen.getByLabelText(
      /Caption for cat.webp/i
    ) as HTMLInputElement;
    expect(captionInput.value).toBe("Booth 2024");
  });

  it("does NOT render caption inputs when allowCaption is off", () => {
    render(
      <PortfolioGallery
        section="promo"
        images={[baseImage]}
        totalCap={20}
        totalUsed={0}
      />
    );
    expect(
      screen.queryByLabelText(/Caption for/i)
    ).not.toBeInTheDocument();
  });

  it("uses section-appropriate caption placeholder copy by default", () => {
    const { unmount } = render(
      <PortfolioGallery
        section="promo"
        images={[baseImage]}
        totalCap={20}
        totalUsed={0}
        allowCaption
      />
    );
    expect(
      screen.getByPlaceholderText(/brand logo|banner/i)
    ).toBeInTheDocument();
    unmount();

    render(
      <PortfolioGallery
        section="product"
        images={[baseImage]}
        totalCap={20}
        totalUsed={0}
        allowCaption
      />
    );
    expect(
      screen.getByPlaceholderText(/describe this piece/i)
    ).toBeInTheDocument();
  });

  it("PATCHes the caption on blur when allowCaption is on", async () => {
    render(
      <PortfolioGallery
        section="product"
        images={[baseImage]}
        totalCap={20}
        totalUsed={0}
        allowCaption
      />
    );
    const captionInput = screen.getByLabelText(/Caption for cat.webp/i);
    fireEvent.change(captionInput, { target: { value: "A3 giclée print" } });
    fireEvent.blur(captionInput);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/portfolio",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("A3 giclée print"),
        })
      );
    });
  });
});
