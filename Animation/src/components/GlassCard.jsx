import { COLORS } from "../constants.js";

export const GlassCard = ({ children, style = {} }) => (
  <div
    style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
      border: `1px solid ${COLORS.glassBorder}`,
      borderRadius: 24,
      padding: "40px 48px",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      boxShadow: "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)",
      ...style,
    }}
  >
    {children}
  </div>
);
