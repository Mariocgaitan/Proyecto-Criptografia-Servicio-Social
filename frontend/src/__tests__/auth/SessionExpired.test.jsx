import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthWizard from "@/pages/AuthWizard";

// --- useAuth ---
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ login: vi.fn(), fetchUser: vi.fn(), user: null, loading: false }),
}));

// --- @react-oauth/google ---
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="google-login" />,
  GoogleOAuthProvider: ({ children }) => children,
}));

// --- framer-motion ---
/* eslint-disable no-unused-vars -- destructured props are filtered out of ...rest */
vi.mock("framer-motion", () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag) =>
        ({ children, ...props }) => {
          // drop framer-specific props so React doesn't warn
          const {
            initial, animate, exit, transition, variants, custom, whileHover,
            whileTap, layout, layoutId, ...rest
          } = props;
          return <tag {...rest}>{children}</tag>;
        },
    }
  );
  const AnimatePresence = ({ children }) => <>{children}</>;
  return { motion, AnimatePresence };
});
/* eslint-enable no-unused-vars */

// --- UI components ---
vi.mock("@/components/ui/progress-indicator", () => ({
  default: () => <div data-testid="progress-indicator" />,
}));

vi.mock("@/components/ui/enable-2fa-card", () => ({
  Component: () => <div data-testid="enable-2fa-card" />,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props) => <input {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

// --- lucide-react icons ---
vi.mock("lucide-react", () => ({
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eyeoff" />,
  Loader2: () => <span data-testid="icon-loader2" />,
  ArrowRight: () => <span data-testid="icon-arrowright" />,
  ArrowLeft: () => <span data-testid="icon-arrowleft" />,
  Mail: () => <span data-testid="icon-mail" />,
  Lock: () => <span data-testid="icon-lock" />,
  ShieldCheck: () => <span data-testid="icon-shieldcheck" />,
}));

// --- image assets ---
vi.mock("@/assets/tec_logo.png", () => ({ default: "img.png" }));
vi.mock("@/assets/ser_social_negro.jpg", () => ({ default: "img.png" }));
vi.mock("@/assets/login_images/ser_social_header.png", () => ({ default: "img.png" }));
vi.mock(
  "@/assets/login_images/estudiantado-programa-servicio-social-tec-monterrey.jpg-2279428079.webp",
  () => ({ default: "img.png" })
);
vi.mock("@/assets/login_images/ser_social_monterrey.jpg", () => ({ default: "img.png" }));
vi.mock("@/assets/login_images/ser_social3.jpg", () => ({ default: "img.png" }));

// --- @/lib/api ---
vi.mock("@/lib/api", () => ({
  apiUrl: (path) => path,
}));

// ---------------------------------------------------------------------------

beforeEach(() => {
  // Mock fetch to return a valid nonce response
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ nonce: "test-nonce" }),
    })
  );

  // Prevent actual URL manipulation
  window.history.replaceState = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthWizard — session expired banner", () => {
  it("shows expired session message when ?expired=true", async () => {
    render(
      <MemoryRouter initialEntries={["/login?expired=true"]}>
        <AuthWizard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/sesión ha expirado/i)
      ).toBeInTheDocument();
    });
  });

  it("does not show expired message on normal login", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthWizard />
      </MemoryRouter>
    );

    // Give effects time to run
    await waitFor(() => {
      expect(
        screen.queryByText(/sesión ha expirado/i)
      ).not.toBeInTheDocument();
    });
  });
});
