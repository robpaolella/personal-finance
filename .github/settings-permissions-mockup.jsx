import { useState } from "react";

const dark = {
  bgMain: "#0b0f1a", bgCard: "#141926", bgCardBorder: "#1e293b", bgHover: "#1a2234",
  textPrimary: "#f1f5f9", textBody: "#94a3b8", textSecondary: "#64748b", textMuted: "#475569",
  accent: "#3b82f6", positive: "#10b981", negative: "#ef4444",
  btnPrimaryBg: "#e2e8f0", btnPrimaryText: "#0f172a",
  btnSecBg: "#1a2234", btnSecText: "#94a3b8",
  btnDestructiveBg: "#ef4444", btnDestructiveText: "#ffffff",
  sidebar: "#060a13", sidebarActive: "rgba(59,130,246,0.15)", sidebarActiveText: "#93c5fd", sidebarText: "#94a3b8",
  disabledBg: "#0f1629", disabledText: "#334155", disabledBorder: "#1e293b",
};

const sans = { fontFamily: "'DM Sans', sans-serif" };
const mono = { fontFamily: "'DM Mono', monospace" };

function Badge({ bg, text, label }) {
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: bg, color: text, ...sans, fontWeight: 500 }}>{label}</span>;
}

function DisabledOverlay({ children, tooltip }) {
  return (
    <div style={{ position: "relative", opacity: 0.5, pointerEvents: "none" }}>
      {children}
      {tooltip && <div style={{ position: "absolute", top: 0, right: 0, fontSize: 10, color: dark.textMuted, fontStyle: "italic" }}>{tooltip}</div>}
    </div>
  );
}

function Card({ title, subtitle, children, noPad }) {
  return (
    <div style={{ background: dark.bgCard, border: `1px solid ${dark.bgCardBorder}`, borderRadius: 12, padding: noPad ? 0 : "16px 20px", overflow: "hidden" }}>
      {title && <div style={{ padding: noPad ? "16px 20px 0" : 0 }}><h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: dark.textSecondary, margin: "4px 0 0" }}>{subtitle}</p>}</div>}
      <div style={{ padding: noPad ? "12px 20px 16px" : "12px 0 0" }}>{children}</div>
    </div>
  );
}

function AccountRow({ name, last4, owners, type, cls, canEdit }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.7fr 0.3fr", gap: 4, padding: "8px 0", borderBottom: `1px solid ${dark.bgCardBorder}22`, alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{name} {last4 && <span style={{ color: dark.textMuted, fontSize: 11 }}>({last4})</span>}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {owners.map(o => <Badge key={o} bg={o === "Robert" ? "#1e3a5f" : "#4a1942"} text={o === "Robert" ? "#60a5fa" : "#f472b6"} label={o} />)}
      </div>
      <span style={{ fontSize: 12, color: dark.textBody }}>{type}</span>
      <Badge bg={cls === "Liability" ? "#3b1111" : "#052e16"} text={cls === "Liability" ? "#fca5a5" : "#34d399"} label={cls} />
      {canEdit && <span style={{ color: dark.textMuted, cursor: "pointer", fontSize: 13 }}>✎</span>}
    </div>
  );
}

function CategoryGroup({ name, color, subs }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `2px solid ${color}30` }}>
        <span style={{ fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{name}
        </span>
        <span style={{ fontSize: 11, color: dark.textMuted }}>{subs.length} subs</span>
      </div>
      {subs.map(s => <div key={s} style={{ padding: "3px 0 3px 18px", fontSize: 12, color: dark.textBody }}>{s}</div>)}
    </div>
  );
}

function PermissionToggle({ label, enabled, locked }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${dark.bgCardBorder}22` }}>
      <span style={{ fontSize: 12, color: dark.textBody }}>{label}</span>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: locked ? dark.disabledBg : enabled ? dark.positive : dark.bgHover, border: `1px solid ${locked ? dark.disabledBorder : enabled ? dark.positive : dark.bgCardBorder}`, position: "relative", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.4 : 1 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: locked ? dark.disabledText : "#fff", position: "absolute", top: 1, left: enabled ? 17 : 1, transition: "left 150ms ease" }} />
      </div>
    </div>
  );
}

const ACCOUNTS = [
  { name: "Chase Checking", last4: "2910", owners: ["Robert"], type: "Checking", cls: "Liquid" },
  { name: "Chase Savings", last4: "6152", owners: ["Robert"], type: "Savings", cls: "Liquid" },
  { name: "Blue Cash Preferred", last4: "1009", owners: ["Robert"], type: "Credit", cls: "Liability" },
  { name: "US Bank Checking", last4: "2214", owners: ["Kathleen"], type: "Checking", cls: "Liquid" },
];

const CATEGORIES = [
  { group: "Income", color: "#f97316", subs: ["Take Home Pay", "401(k)", "Interest Income"] },
  { group: "Daily Living", color: "#10b981", subs: ["Dining/Eating Out", "Groceries", "Pets"] },
  { group: "Household", color: "#3b82f6", subs: ["Rent", "Appliances", "Maintenance"] },
];

export default function SettingsComparison() {
  const [view, setView] = useState("admin");
  const [activeTab, setTab] = useState("Settings");
  const isAdmin = view === "admin";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ background: dark.bgMain, minHeight: "100vh", ...sans, color: dark.textPrimary }}>

        {/* Sticky view toggle */}
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: dark.sidebar, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${dark.bgCardBorder}` }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Settings Page Comparison</span>
            <span style={{ fontSize: 12, color: dark.textSecondary, marginLeft: 12 }}>Toggle between Admin and Member views</span>
          </div>
          <div style={{ display: "flex", background: dark.bgHover, borderRadius: 8, padding: 2 }}>
            {["admin", "member"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "6px 16px", fontSize: 12, fontWeight: view === v ? 600 : 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans,
                background: view === v ? dark.bgCardBorder : "transparent",
                color: view === v ? dark.textPrimary : dark.textSecondary,
              }}>{v === "admin" ? "👑 Admin View" : "👤 Member View"}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
            <p style={{ fontSize: 12, color: dark.textMuted, margin: 0 }}>
              {isAdmin ? "Full admin access — all sections editable, user management available" : "Member access — read-only sections are grayed out, destructive actions hidden"}
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", background: dark.bgHover, borderRadius: 8, padding: 2, marginBottom: 20, width: "fit-content" }}>
            {["Settings", "Preferences"].map(tab => (
              <button key={tab} onClick={() => setTab(tab)} style={{
                padding: "7px 20px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, border: "none", borderRadius: 6, cursor: "pointer", ...sans,
                background: activeTab === tab ? dark.bgCardBorder : "transparent",
                color: activeTab === tab ? dark.textPrimary : dark.textSecondary,
              }}>{tab}</button>
            ))}
          </div>

          {activeTab === "Settings" && (<>

          {/* Bank Sync */}
          {isAdmin ? (
            <Card title="Bank Sync" subtitle="Connect your bank accounts via SimpleFIN for automatic transaction import">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: dark.bgHover, borderRadius: 8, marginTop: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Household Banks</span>
                  <Badge bg="#1a2234" text="#64748b" label="Shared" />
                  <div style={{ fontSize: 11, color: dark.textMuted, marginTop: 2 }}>6 accounts linked · Last synced 2h ago</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: dark.textMuted, cursor: "pointer" }}>✎</span>
                  <button style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: dark.btnDestructiveBg, color: dark.btnDestructiveText, ...sans }}>Delete</button>
                </div>
              </div>
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <span style={{ fontSize: 12, color: dark.accent, cursor: "pointer" }}>+ Add Connection</span>
              </div>
            </Card>
          ) : (
            <Card title="Bank Sync" subtitle="Connect your bank accounts via SimpleFIN for automatic transaction import">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: dark.bgHover, borderRadius: 8, marginTop: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Household Banks</span>
                  <Badge bg="#1a2234" text="#64748b" label="Shared" />
                  <div style={{ fontSize: 11, color: dark.textMuted, marginTop: 2 }}>6 accounts linked · Last synced 2h ago</div>
                </div>
                <Badge bg="#1a2234" text="#475569" label="View Only" />
              </div>
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: dark.textMuted, fontStyle: "italic" }}>Contact an admin to manage connections</span>
              </div>
            </Card>
          )}

          <div style={{ height: 20 }} />

          {/* Accounts & Categories */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
            {/* Accounts */}
            <Card title="Accounts" subtitle="Each account has an owner and classification for filtering and net worth.">
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.7fr 0.3fr", gap: 4, padding: "6px 0", borderBottom: `2px solid ${dark.bgCardBorder}` }}>
                {["ACCOUNT", "OWNER", "TYPE", "CLASS", ""].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                ))}
              </div>
              {ACCOUNTS.map((a, i) => <AccountRow key={i} {...a} canEdit={isAdmin} />)}
              {isAdmin ? (
                <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: dark.btnSecBg, color: dark.btnSecText, marginTop: 12, ...sans }}>+ Add Account</button>
              ) : (
                <div style={{ marginTop: 12, opacity: 0.4, pointerEvents: "none" }}>
                  <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px dashed ${dark.bgCardBorder}`, fontSize: 13, fontWeight: 600, background: "transparent", color: dark.textMuted, ...sans }}>+ Add Account</button>
                </div>
              )}
            </Card>

            {/* Categories */}
            <Card title="Categories" subtitle="Parent categories group sub-categories for budgets and reports.">
              {CATEGORIES.map((g, i) => <CategoryGroup key={i} {...g} />)}
              {isAdmin ? (
                <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: dark.btnSecBg, color: dark.btnSecText, marginTop: 12, ...sans }}>+ Add Category</button>
              ) : (
                <div style={{ marginTop: 12, opacity: 0.4, pointerEvents: "none" }}>
                  <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px dashed ${dark.bgCardBorder}`, fontSize: 13, fontWeight: 600, background: "transparent", color: dark.textMuted, ...sans }}>+ Add Category</button>
                </div>
              )}
            </Card>
          </div>

          <div style={{ height: 20 }} />

          {/* User Management — Admin Only */}
          {isAdmin && (
            <Card title="Users & Permissions" subtitle="Manage household members and their access levels.">
              <div style={{ marginTop: 8 }}>
                {/* User 1 */}
                <div style={{ padding: "12px", background: dark.bgHover, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#60a5fa" }}>R</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Robert</div>
                        <div style={{ fontSize: 11, color: dark.textMuted }}>robert</div>
                      </div>
                    </div>
                    <Badge bg="#052e16" text="#34d399" label="Admin" />
                  </div>
                  <div style={{ fontSize: 11, color: dark.textMuted, fontStyle: "italic", padding: "4px 0" }}>Admins have all permissions. Cannot be restricted.</div>
                </div>

                {/* User 2 */}
                <div style={{ padding: "12px", background: dark.bgHover, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4a1942", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#f472b6" }}>K</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Kathleen</div>
                        <div style={{ fontSize: 11, color: dark.textMuted }}>kathleen</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge bg="#1e3a5f" text="#60a5fa" label="Member" />
                      <span style={{ color: dark.textMuted, cursor: "pointer", fontSize: 13 }}>✎</span>
                    </div>
                  </div>

                  {/* Permission groups */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Transactions</div>
                      <PermissionToggle label="Create" enabled={true} />
                      <PermissionToggle label="Edit" enabled={true} />
                      <PermissionToggle label="Delete" enabled={false} />
                      <PermissionToggle label="Bulk Edit" enabled={false} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Settings</div>
                      <PermissionToggle label="Manage Accounts" enabled={false} />
                      <PermissionToggle label="Manage Categories" enabled={false} />
                      <PermissionToggle label="Manage Connections" enabled={false} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: dark.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Finance</div>
                      <PermissionToggle label="Edit Budgets" enabled={true} />
                      <PermissionToggle label="Update Balances" enabled={true} />
                      <PermissionToggle label="Manage Assets" enabled={false} />
                      <PermissionToggle label="CSV Import" enabled={true} />
                      <PermissionToggle label="Bank Sync Import" enabled={true} />
                    </div>
                  </div>
                </div>

                <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: dark.btnSecBg, color: dark.btnSecText, ...sans }}>+ Add User</button>
              </div>
            </Card>
          )}

          </>)}

          {/* Preferences Tab — Available to all users */}
          {activeTab === "Preferences" && (
            <Card title="My Preferences" subtitle="Manage your profile and display settings.">
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: dark.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Display Name</label>
                    <input defaultValue={isAdmin ? "Robert" : "Kathleen"} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${dark.bgCardBorder}`, borderRadius: 8, fontSize: 13, background: dark.bgHover, color: dark.textPrimary, outline: "none", ...sans, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: dark.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Username</label>
                    <input defaultValue={isAdmin ? "robert" : "kathleen"} disabled style={{ width: "100%", padding: "8px 12px", border: `1px solid ${dark.disabledBorder}`, borderRadius: 8, fontSize: 13, background: dark.disabledBg, color: dark.disabledText, outline: "none", ...sans, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 12, color: dark.textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Change Password</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <input type="password" placeholder="Current password" style={{ padding: "8px 12px", border: `1px solid ${dark.bgCardBorder}`, borderRadius: 8, fontSize: 13, background: dark.bgHover, color: dark.textPrimary, outline: "none", ...sans }} />
                    <input type="password" placeholder="New password" style={{ padding: "8px 12px", border: `1px solid ${dark.bgCardBorder}`, borderRadius: 8, fontSize: 13, background: dark.bgHover, color: dark.textPrimary, outline: "none", ...sans }} />
                    <input type="password" placeholder="Confirm new" style={{ padding: "8px 12px", border: `1px solid ${dark.bgCardBorder}`, borderRadius: 8, fontSize: 13, background: dark.bgHover, color: dark.textPrimary, outline: "none", ...sans }} />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 12, color: dark.textSecondary }}>Role: </span>
                    <Badge bg={isAdmin ? "#052e16" : "#1e3a5f"} text={isAdmin ? "#34d399" : "#60a5fa"} label={isAdmin ? "Admin" : "Member"} />
                    {!isAdmin && <span style={{ fontSize: 11, color: dark.textMuted, marginLeft: 8 }}>Permissions managed by admin</span>}
                  </div>
                  <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: dark.btnPrimaryBg, color: dark.btnPrimaryText, ...sans }}>Save Changes</button>
                </div>
              </div>
            </Card>
          )}

          {/* Visual legend */}
          <div style={{ marginTop: 24, padding: "14px 20px", background: dark.bgCard, border: `1px solid ${dark.bgCardBorder}`, borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: dark.textSecondary, marginBottom: 8 }}>How Permissions Affect the UI</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 12, color: dark.textBody }}>
              <div>
                <div style={{ fontWeight: 600, color: dark.textPrimary, marginBottom: 4 }}>Destructive Actions</div>
                <div>Delete buttons, bulk delete — <span style={{ color: dark.negative }}>hidden entirely</span> when user lacks permission</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: dark.textPrimary, marginBottom: 4 }}>Creative/Edit Actions</div>
                <div>Add buttons, edit icons, inline edits — <span style={{ color: dark.textMuted }}>disabled and grayed</span> when user lacks permission</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: dark.textPrimary, marginBottom: 4 }}>Admin-Only Sections</div>
                <div>Users & Permissions — <span style={{ color: dark.textMuted }}>completely hidden</span> from non-admin users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
