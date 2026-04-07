import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth");

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) =>
        ({ children, ...props }) => {
          const Tag = typeof tag === "string" ? tag : "div";
          return <Tag {...props}>{children}</Tag>;
        },
    }
  ),
  AnimatePresence: ({ children }) => children,
}));

const renderNotFound = () =>
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  );

describe("NotFound", () => {
  it("renders 404 message", () => {
    useAuth.mockReturnValue({ user: null });
    renderNotFound();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("shows link for unauthenticated users", () => {
    useAuth.mockReturnValue({ user: null });
    renderNotFound();
    expect(screen.getByText(/volver/i)).toBeInTheDocument();
  });
});
