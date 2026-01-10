import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function Unauthorized() {
  const navigate = useNavigate();
  const { roles } = useAuthStore();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          padding: "32px",
          borderRadius: "16px",
          border: "1px solid rgb(var(--border))",
          background: "rgb(var(--card))",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
          }}
        >
          🔒
        </div>

        <h1
          style={{
            margin: "0 0 12px 0",
            fontSize: "24px",
            fontWeight: 900,
          }}
        >
          Access Restricted
        </h1>

        <p
          style={{
            margin: "0 0 24px 0",
            color: "rgb(var(--muted))",
            lineHeight: 1.6,
          }}
        >
          You don't have the required permissions to access this page. Your current role(s) do
          not include access to this module.
        </p>

        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "rgb(var(--background))",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "rgb(var(--muted))",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Your Current Roles
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {roles && roles.length > 0 ? (
              roles.map((role) => (
                <span
                  key={role}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "rgba(148,163,184,0.12)",
                    color: "rgb(100,116,139)",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {role}
                </span>
              ))
            ) : (
              <span
                style={{
                  color: "rgb(var(--muted))",
                  fontSize: "13px",
                }}
              >
                No roles assigned
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.2)",
            marginBottom: "24px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "rgb(37,99,235)",
              marginBottom: "8px",
            }}
          >
            💡 Need Access?
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "rgb(var(--muted))",
              lineHeight: 1.6,
            }}
          >
            Contact your <strong>Tenant Administrator</strong> to request the appropriate role
            assignment for this module.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Go Back
          </button>

          <button
            onClick={() => navigate("/portfolio")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "rgb(var(--primary))",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
