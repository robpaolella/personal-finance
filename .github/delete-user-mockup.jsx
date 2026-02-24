import { useState } from "react";

const dark = {
  bgMain: "#0b0f1a", bgCard: "#141926", bgCardBorder: "#1e293b", bgHover: "#1a2234",
  bgModal: "rgba(0,0,0,0.7)",
  bgInlineError: "#3b1111", bgInlineErrorBorder: "#7f1d1d", textInlineError: "#fca5a5",
  bgInlineWarning: "#3b2506", bgInlineWarningBorder: "#78350f", textInlineWarning: "#fcd34d",
  textPrimary: "#f1f5f9", textBody: "#94a3b8", textSecondary: "#64748b", textMuted: "#475569",
  accent: "#3b82f6", positive: "#10b981", negative: "#ef4444",
  btnPrimaryBg: "#e2e8f0", btnPrimaryText: "#0f172a",
  btnSecBg: "#1a2234", btnSecText: "#94a3b8",
  btnDestructiveBg: "#ef4444", btnDestructiveText: "#ffffff",
  inputBg: "#0f1629", inputBorder: "#1e293b",
};

const sans = { fontFamily: "'DM Sans', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

function Badge({ bg, text, label }) {
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: bg, color: text, ...sans, fontWeight: 500 }}>{label}</span>;
}

export default function DeleteUserModal() {
  const [step, setStep] = useState("preview"); // preview, confirm
  const [assignments, setAssignments] = useState({ 5: "", 8: "" });
  const [confirmText, setConfirmText] = useState("");

  const allAssigned = Object.values(assignments).every(v => v !== "");
  const confirmReady = confirmText === "kathleen";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ background: dark.bgMain, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", ...sans, color: dark.textPrimary }}>

        {/* Step toggle for demo */}
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", background: dark.bgHover, borderRadius: 8, padding: 2 }}>
          {["preview", "confirm"].map(s => (
            <button key={s} onClick={() => setStep(s)} style={{
              padding: "6px 16px", fontSize: 12, fontWeight: step === s ? 600 : 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans,
              background: step === s ? dark.bgCardBorder : "transparent",
              color: step === s ? dark.textPrimary : dark.textSecondary,
            }}>{s === "preview" ? "Step 1: Review & Reassign" : "Step 2: Confirm Deletion"}</button>
          ))}
        </div>

        {/* Modal backdrop */}
        <div style={{ background: dark.bgModal, position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>

          {/* Modal */}
          <div style={{ background: dark.bgCard, border: `1px solid ${dark.bgCardBorder}`, borderRadius: 12, padding: "24px 28px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", width: 520, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>

            {step === "preview" && (
              <>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4a1942", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#f472b6", flexShrink: 0 }}>K</div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Permanently Delete Kathleen?</h2>
                    <span style={{ fontSize: 12, color: dark.textSecondary }}>@kathleen · <Badge bg="#1e3a5f" text="#60a5fa" label="Member" /></span>
                  </div>
                </div>

                {/* Destructive warning */}
                <div style={{ padding: "12px 14px", borderRadius: 8, background: dark.bgInlineError, border: `1px solid ${dark.bgInlineErrorBorder}`, color: dark.textInlineError, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                  <strong>This action is permanent and cannot be undone.</strong> The user account will be completely removed from the system. All permissions will be deleted. The user will no longer appear in the app.
                </div>

                {/* What will be preserved */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>What Will Be Preserved</div>
                  <div style={{ fontSize: 13, color: dark.textBody, lineHeight: 1.6 }}>
                    Transactions, budgets, balance history, and all other financial data are tied to accounts — not users. Deleting this user will <strong style={{ color: dark.textPrimary }}>not</strong> remove any financial data.
                  </div>
                </div>

                {/* What will be removed */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>What Will Be Removed</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, fontSize: 13, color: dark.textBody }}>
                      <span style={{ color: dark.negative }}>✗</span> User account and login credentials
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 13, color: dark.textBody }}>
                      <span style={{ color: dark.negative }}>✗</span> All permission settings
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 13, color: dark.textBody }}>
                      <span style={{ color: dark.negative }}>✗</span> 1 personal SimpleFIN connection and its linked accounts
                    </div>
                  </div>
                </div>

                {/* Account reassignment */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Account Reassignment Required</div>
                  <div style={{ fontSize: 12, color: dark.textMuted, marginBottom: 12 }}>The following accounts are solely owned by Kathleen and must be reassigned to another user before deletion.</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Sole-owned account 1 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: dark.bgHover, borderRadius: 8 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>US Bank Checking</span>
                        <span style={{ fontSize: 11, color: dark.textMuted, ...mono, marginLeft: 6 }}>(2214)</span>
                        <div style={{ fontSize: 11, color: dark.textMuted, marginTop: 2 }}>Checking · Liquid</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: dark.textMuted }}>→</span>
                        <select value={assignments[5]} onChange={e => setAssignments({ ...assignments, 5: e.target.value })}
                          style={{ padding: "6px 10px", border: `1px solid ${dark.inputBorder}`, borderRadius: 6, fontSize: 12, background: dark.inputBg, color: dark.textPrimary, cursor: "pointer", ...sans, minWidth: 140 }}>
                          <option value="">Select new owner</option>
                          <option value="robert">Robert</option>
                        </select>
                      </div>
                    </div>

                    {/* Sole-owned account 2 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: dark.bgHover, borderRadius: 8 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>US Bank Savings</span>
                        <span style={{ fontSize: 11, color: dark.textMuted, ...mono, marginLeft: 6 }}>(8490)</span>
                        <div style={{ fontSize: 11, color: dark.textMuted, marginTop: 2 }}>Savings · Liquid</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: dark.textMuted }}>→</span>
                        <select value={assignments[8]} onChange={e => setAssignments({ ...assignments, 8: e.target.value })}
                          style={{ padding: "6px 10px", border: `1px solid ${dark.inputBorder}`, borderRadius: 6, fontSize: 12, background: dark.inputBg, color: dark.textPrimary, cursor: "pointer", ...sans, minWidth: 140 }}>
                          <option value="">Select new owner</option>
                          <option value="robert">Robert</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Co-owned accounts info */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Co-Owned Accounts</div>
                  <div style={{ fontSize: 12, color: dark.textMuted, marginBottom: 8 }}>Kathleen will be removed as co-owner. Other owners are unaffected.</div>
                  <div style={{ padding: "8px 12px", background: dark.bgHover, borderRadius: 8, fontSize: 13, color: dark.textBody }}>
                    Chase Total Checking <span style={{ ...mono, fontSize: 11, color: dark.textMuted }}>(3732)</span> <span style={{ fontSize: 11, color: dark.textMuted }}>— Robert remains as owner</span>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
                  <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: dark.btnSecBg, color: dark.btnSecText, ...sans }}>Cancel</button>
                  <button onClick={() => allAssigned && setStep("confirm")} style={{
                    padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...sans,
                    background: allAssigned ? dark.btnDestructiveBg : dark.bgHover,
                    color: allAssigned ? dark.btnDestructiveText : dark.textMuted,
                    opacity: allAssigned ? 1 : 0.5,
                  }}>Continue to Confirmation</button>
                </div>
              </>
            )}

            {step === "confirm" && (
              <>
                {/* Header */}
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Final Confirmation</h2>

                {/* Big red warning */}
                <div style={{ padding: "16px", borderRadius: 8, background: dark.bgInlineError, border: `1px solid ${dark.bgInlineErrorBorder}`, color: dark.textInlineError, fontSize: 13, marginBottom: 20, lineHeight: 1.6, textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
                  <strong>You are about to permanently delete the user "Kathleen".</strong>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>
                    2 accounts will be reassigned to Robert.
                    <br />1 co-owned account will have Kathleen removed.
                    <br />1 personal SimpleFIN connection will be deleted.
                  </div>
                </div>

                {/* Type to confirm */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: dark.textBody, display: "block", marginBottom: 8 }}>
                    Type <strong style={{ color: dark.textPrimary, ...mono }}>kathleen</strong> to confirm deletion:
                  </label>
                  <input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="Type username here..."
                    style={{ width: "100%", padding: "10px 12px", border: `1px solid ${confirmReady ? dark.negative : dark.inputBorder}`, borderRadius: 8, fontSize: 14, background: dark.inputBg, color: dark.textPrimary, outline: "none", ...mono, boxSizing: "border-box" }}
                  />
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                  <button onClick={() => setStep("preview")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: dark.btnSecBg, color: dark.btnSecText, ...sans }}>← Back</button>
                  <button style={{
                    padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", ...sans,
                    background: confirmReady ? dark.btnDestructiveBg : dark.bgHover,
                    color: confirmReady ? dark.btnDestructiveText : dark.textMuted,
                    opacity: confirmReady ? 1 : 0.5,
                  }}>Permanently Delete User</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
