import React from "react";

type Props = {
  href: string; // absolute or relative
  label?: string; // optional aria label
  compact?: boolean;
};

export function CopyLinkButton({ href, label = "Copy link", compact = true }: Props) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for older environments
      const ta = document.createElement("textarea");
      ta.value = href;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied!" : label}
      aria-label={label}
      style={{
        padding: compact ? "6px 8px" : "8px 10px",
        borderRadius: 10,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--bg))",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
        color: copied ? "rgb(var(--primary))" : "inherit",
      }}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
