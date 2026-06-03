"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icons";
import { Btn } from "@/components/ui/Btn";
import { Card, Divider } from "@/components/ui/Card";

type Role = "admin" | "supervisor" | "subcontractor";
type Status = "active" | "inactive" | "invited";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  lastActive: string;
  initials: string;
  color: string;
}

const MOCK_USERS: User[] = [
  { id: "u1", name: "Jolene Galliano",  email: "jolene@beletage.com",   role: "admin",         status: "active",   lastActive: "Just now",    initials: "JG", color: "#1a1814" },
  { id: "u2", name: "Marcus Stone",     email: "marcus@beletage.com",   role: "supervisor",    status: "active",   lastActive: "2 hours ago", initials: "MS", color: "#5c3d8a" },
  { id: "u3", name: "Ray Thompson",     email: "ray@beletage.com",      role: "supervisor",    status: "active",   lastActive: "Yesterday",   initials: "RT", color: "#3b5378" },
  { id: "u4", name: "Maria Chen",       email: "maria@beletage.com",    role: "admin",         status: "active",   lastActive: "3 days ago",  initials: "MC", color: "#2f6848" },
  { id: "u5", name: "Tomas Mercer",     email: "tomas@contractor.net",  role: "subcontractor", status: "active",   lastActive: "Today",       initials: "TM", color: "#6b8cbf" },
  { id: "u6", name: "Karen Riley",      email: "karen@contractor.net",  role: "subcontractor", status: "active",   lastActive: "Today",       initials: "KR", color: "#8a5a8a" },
  { id: "u7", name: "Devon Simms",      email: "devon@contractor.net",  role: "subcontractor", status: "invited",  lastActive: "—",           initials: "DS", color: "#4a8a6a" },
  { id: "u8", name: "Priya Nair",       email: "priya@beletage.com",    role: "supervisor",    status: "invited",  lastActive: "—",           initials: "PN", color: "#c9782a" },
];

const ROLE_META: Record<Role, { label: string; bg: string; fg: string; dot: string }> = {
  admin:         { label: "Admin",         bg: "#f0f0ee", fg: "#1a1814", dot: "#1a1814" },
  supervisor:    { label: "Supervisor",    bg: "#f0ebf7", fg: "#5c3d8a", dot: "#7b5ea7" },
  subcontractor: { label: "Subcontractor", bg: "#eef2f7", fg: "#3b5378", dot: "#6b8cbf" },
};

const STATUS_META: Record<Status, { label: string; color: string }> = {
  active:  { label: "Active",  color: "#2f6848" },
  inactive: { label: "Inactive", color: "#8a8780" },
  invited: { label: "Invited", color: "#8a5a1a" },
};

const PERMISSIONS: { label: string; admin: boolean; supervisor: boolean; subcontractor: boolean }[] = [
  { label: "Dashboard overview",       admin: true,  supervisor: true,  subcontractor: false },
  { label: "View invoices",            admin: true,  supervisor: false, subcontractor: false },
  { label: "Import invoices",          admin: true,  supervisor: false, subcontractor: false },
  { label: "Assignments board",        admin: true,  supervisor: true,  subcontractor: false },
  { label: "Approvals",                admin: true,  supervisor: true,  subcontractor: false },
  { label: "Quotes",                   admin: true,  supervisor: true,  subcontractor: true  },
  { label: "Payroll",                  admin: true,  supervisor: false, subcontractor: false },
  { label: "Subcontractors",           admin: true,  supervisor: true,  subcontractor: false },
  { label: "Price list",               admin: true,  supervisor: false, subcontractor: false },
  { label: "Expenses",                 admin: true,  supervisor: false, subcontractor: false },
  { label: "Profitability",            admin: true,  supervisor: false, subcontractor: false },
  { label: "Users & permissions",      admin: true,  supervisor: false, subcontractor: false },
  { label: "Mobile job view",          admin: false, supervisor: false, subcontractor: true  },
  { label: "Submit completion notes",  admin: false, supervisor: false, subcontractor: true  },
];

export function UsersScreen() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("supervisor");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [permOpen, setPermOpen] = useState(false);

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    supervisor: users.filter((u) => u.role === "supervisor").length,
    subcontractor: users.filter((u) => u.role === "subcontractor").length,
    invited: users.filter((u) => u.status === "invited").length,
  };

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviteSuccess(true);
    setTimeout(() => {
      const newUser: User = {
        id: "u" + Date.now(),
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        status: "invited",
        lastActive: "—",
        initials: inviteName.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
        color: ROLE_META[inviteRole].dot,
      };
      setUsers((prev) => [...prev, newUser]);
      setInviteOpen(false);
      setInviteSuccess(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("supervisor");
    }, 1500);
  };

  const handleRoleChange = (userId: string, role: Role) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role, color: ROLE_META[role].dot } : u));
    setEditId(null);
  };

  const handleRemove = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setRemoveId(null);
  };

  return (
    <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total users",      value: counts.total,         color: "#1a1814" },
          { label: "Admins",           value: counts.admin,         color: "#1a1814" },
          { label: "Supervisors",      value: counts.supervisor,    color: "#5c3d8a" },
          { label: "Subcontractors",   value: counts.subcontractor, color: "#3b5378" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "#8a8780", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: s.color, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            {s.label === "Total users" && counts.invited > 0 && (
              <div style={{ fontSize: 11, color: "#8a5a1a", marginTop: 4 }}>{counts.invited} invite pending</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>
        {/* Main user list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card pad={0}>
            {/* Toolbar */}
            <div style={{ padding: "14px 16px", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8a8780" }}>
                  <Icon.search />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users…"
                  style={{ width: "100%", paddingLeft: 32, paddingRight: 10, height: 34, border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fafaf8", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["all", "admin", "supervisor", "subcontractor"] as const).map((r) => (
                  <button key={r} onClick={() => setFilterRole(r)} style={{
                    padding: "5px 11px", borderRadius: 6, border: "1px solid", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500,
                    borderColor: filterRole === r ? "#1a1814" : "#dcd9d2",
                    background: filterRole === r ? "#1a1814" : "#fff",
                    color: filterRole === r ? "#fff" : "#6b6860",
                  }}>
                    {r === "all" ? "All" : ROLE_META[r].label}
                  </button>
                ))}
              </div>
              <Btn variant="primary" size="sm" icon={<Icon.plus />} onClick={() => { setInviteOpen(!inviteOpen); setInviteSuccess(false); }}>
                Invite user
              </Btn>
            </div>

            {/* Invite form */}
            {inviteOpen && (
              <>
                <Divider />
                <div style={{ padding: "16px 20px", background: "#fafaf8" }}>
                  {inviteSuccess ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#e8f1ec", border: "1px solid #c9e0d1", borderRadius: 10 }}>
                      <span style={{ fontSize: 18 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#2f6848" }}>Invite sent to {inviteEmail}</div>
                        <div style={{ fontSize: 11.5, color: "#4a8a6a", marginTop: 2 }}>They'll receive an email with setup instructions.</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Invite a new user</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>Full name</label>
                          <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Smith"
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 5 }}>Email address</label>
                          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@beletage.com"
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #dcd9d2", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 500, color: "#4a4740", display: "block", marginBottom: 8 }}>Role</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {(["admin", "supervisor", "subcontractor"] as const).map((r) => {
                            const m = ROLE_META[r];
                            return (
                              <button key={r} type="button" onClick={() => setInviteRole(r)} style={{
                                padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                                border: inviteRole === r ? `1.5px solid ${m.dot}` : "1px solid #dcd9d2",
                                background: inviteRole === r ? "#fff" : "#fafaf8",
                                boxShadow: inviteRole === r ? `0 0 0 3px ${m.dot}18` : "none",
                              }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: m.dot }}>{m.label}</div>
                                <div style={{ fontSize: 11, color: "#8a8780", marginTop: 3 }}>
                                  {r === "admin" ? "Full access" : r === "supervisor" ? "Operational, no financials" : "Mobile job view only"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Btn variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Btn>
                        <Btn variant="primary" size="sm" icon={<Icon.send />} disabled={!inviteName.trim() || !inviteEmail.trim()} onClick={handleInvite}>
                          Send invite
                        </Btn>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <Divider />

            {/* Column headers */}
            <div style={{ padding: "8px 20px", display: "grid", gridTemplateColumns: "1fr 160px 120px 100px 80px", gap: 12, alignItems: "center" }}>
              {["User", "Role", "Status", "Last active", ""].map((h) => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#8a8780", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>
            <Divider />

            {/* User rows */}
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#a8a49c", fontSize: 13 }}>No users match your search</div>
            ) : (
              filtered.map((u, i) => {
                const rm = ROLE_META[u.role];
                const sm = STATUS_META[u.status];
                const isEditing = editId === u.id;
                const isRemoving = removeId === u.id;

                return (
                  <div key={u.id}>
                    <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 160px 120px 100px 80px", gap: 12, alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                      {/* Name + email */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: u.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                          {u.initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: "#8a8780", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                        </div>
                      </div>

                      {/* Role */}
                      {isEditing ? (
                        <select
                          defaultValue={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          autoFocus
                          onBlur={() => setEditId(null)}
                          style={{ padding: "4px 8px", border: "1px solid #dcd9d2", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff", cursor: "pointer" }}
                        >
                          {(["admin", "supervisor", "subcontractor"] as const).map((r) => (
                            <option key={r} value={r}>{ROLE_META[r].label}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, background: rm.bg, color: rm.fg, fontSize: 12, fontWeight: 500, width: "fit-content" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: rm.dot }} />
                          {rm.label}
                        </span>
                      )}

                      {/* Status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: sm.color }}>{sm.label}</span>
                      </div>

                      {/* Last active */}
                      <div style={{ fontSize: 12, color: "#8a8780" }}>{u.lastActive}</div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button onClick={() => { setEditId(isEditing ? null : u.id); setRemoveId(null); }} title="Change role"
                          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dcd9d2", background: isEditing ? "#f4f2ec" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b6860" }}>
                          <Icon.pencil />
                        </button>
                        <button onClick={() => { setRemoveId(isRemoving ? null : u.id); setEditId(null); }} title="Remove user"
                          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #dcd9d2", background: isRemoving ? "#fef4f4" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isRemoving ? "#c94a2a" : "#6b6860" }}>
                          <Icon.trash />
                        </button>
                      </div>
                    </div>

                    {/* Remove confirmation */}
                    {isRemoving && (
                      <div style={{ padding: "10px 20px 14px 20px", background: "#fff8f6", borderBottom: i < filtered.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#fff", border: "1px solid #f0c4b8", borderRadius: 8 }}>
                          <div style={{ flex: 1, fontSize: 13, color: "#4a4740" }}>Remove <b>{u.name}</b> from the workspace?</div>
                          <Btn variant="ghost" size="sm" onClick={() => setRemoveId(null)}>Cancel</Btn>
                          <Btn variant="danger" size="sm" onClick={() => handleRemove(u.id)}>Remove</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Right panel: permissions reference */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card pad={0}>
            <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Permissions by role</div>
              <button onClick={() => setPermOpen(!permOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8780", fontFamily: "inherit", fontSize: 12 }}>
                {permOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            <Divider />

            {/* Role header */}
            <div style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "1fr repeat(3, 44px)", gap: 6, alignItems: "center" }}>
              <div />
              {(["admin", "supervisor", "subcontractor"] as const).map((r) => (
                <div key={r} style={{ textAlign: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ROLE_META[r].dot, margin: "0 auto 3px" }} />
                  <div style={{ fontSize: 9.5, color: "#8a8780", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.2 }}>
                    {r === "subcontractor" ? "Sub" : ROLE_META[r].label}
                  </div>
                </div>
              ))}
            </div>
            <Divider />

            {(permOpen ? PERMISSIONS : PERMISSIONS.slice(0, 7)).map((p, i, arr) => (
              <div key={p.label} style={{ padding: "9px 16px", display: "grid", gridTemplateColumns: "1fr repeat(3, 44px)", gap: 6, alignItems: "center", borderBottom: i < arr.length - 1 ? "1px solid #f4f2ec" : "none" }}>
                <div style={{ fontSize: 12, color: "#4a4740" }}>{p.label}</div>
                {([p.admin, p.supervisor, p.subcontractor]).map((has, ci) => (
                  <div key={ci} style={{ display: "flex", justifyContent: "center" }}>
                    {has ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2f6848" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12.5 9 17.5l11-11"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d8d4cc" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {!permOpen && (
              <button onClick={() => setPermOpen(true)} style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6b6860", fontFamily: "inherit", borderTop: "1px solid #f4f2ec" }}>
                Show {PERMISSIONS.length - 7} more →
              </button>
            )}
          </Card>

          {/* Role summary cards */}
          {(["admin", "supervisor", "subcontractor"] as const).map((r) => {
            const m = ROLE_META[r];
            const count = users.filter((u) => u.role === r).length;
            return (
              <div key={r} style={{ background: "#fff", border: "1px solid #ecebe6", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: m.fg }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "#8a8780", marginTop: 2 }}>
                    {r === "admin" ? "Full access to all modules" : r === "supervisor" ? "Operational view, no financials" : "Mobile app, job management only"}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#8a8780" }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
