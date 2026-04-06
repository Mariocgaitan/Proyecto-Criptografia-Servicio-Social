import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth");

const renderWithRouter = (allowedRoles) => {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe("ProtectedRoute", () => {
  it("renders children when user is authenticated with correct role", () => {
    useAuth.mockReturnValue({ user: { rol: "admin" }, loading: false });
    renderWithRouter(["admin"]);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /login when user is not authenticated", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderWithRouter(["admin"]);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirects to /unauthorized when user has wrong role", () => {
    useAuth.mockReturnValue({ user: { rol: "alumno" }, loading: false });
    renderWithRouter(["admin"]);
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderWithRouter(["admin"]);
    expect(container.innerHTML).toBe("");
  });
});
