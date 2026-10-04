import { useEffect, useState } from "react";
import {
  CheckCircle, XCircle, LogOut, Users, CreditCard, Image as ImageIcon,
  Loader2, Ban, ShieldCheck, Crown, RotateCcw, ArrowLeft, Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SendNotificationTab from "@/components/admin/SendNotificationTab";

interface PaymentRequestRow {
  id: string;
  user_id: string;
  screenshot_path: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  is_premium: boolean;
  is_banned: boolean;
  premium_expires_at: string | null;
  created_at: string;
}

type Tab = "payments" | "users" | "notify";

const AdminPanel = () => {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("payments");

  // Payments state
  const [requests, setRequests] = useState<PaymentRequestRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "premium" | "free">("all");

  const loadPayments = async () => {
    setLoading(true);
    const { data: reqs, error } = await supabase
      .from("payment_requests")
      .select("id,user_id,screenshot_path,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setRequests((reqs ?? []) as PaymentRequestRow[]);

    // Pre-sign URLs
    const urlMap: Record<string, string> = {};
    await Promise.all(
      (reqs ?? []).map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("payment-screenshots")
          .createSignedUrl(r.screenshot_path, 3600);
        if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
      })
    );
    setSignedUrls(urlMap);

    // Fetch profile info for each user
    const ids = Array.from(new Set((reqs ?? []).map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,email,display_name,is_premium,is_banned,premium_expires_at,created_at")
        .in("id", ids);
      const map: Record<string, ProfileRow> = {};
      (profs ?? []).forEach((p) => (map[p.id] = p as ProfileRow));
      setProfilesById(map);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,display_name,is_premium,is_banned,premium_expires_at,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load users", description: error.message, variant: "destructive" });
    } else {
      setUsers((data ?? []) as ProfileRow[]);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    loadPayments();
    loadUsers();
  }, []);

  const handlePaymentAction = async (req: PaymentRequestRow, action: "approved" | "rejected") => {
    setActingId(req.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from("payment_requests")
        .update({ status: action, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (updErr) throw updErr;

      if (action === "approved") {
        // Grant 7 days of VIP
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        const { error: profErr } = await supabase
          .from("profiles")
          .update({ is_premium: true, premium_expires_at: expires.toISOString() })
          .eq("id", req.user_id);
        if (profErr) throw profErr;
      }

      toast({
        title: action === "approved" ? "VIP Activated (7 days)" : "Request Rejected",
        description: action === "approved" ? "User upgraded to Premium for 1 week." : "Payment was rejected.",
      });
      setRequests((prev) => prev.filter((item) => item.id !== req.id));
      setSignedUrls((prev) => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
      await Promise.all([loadPayments(), loadUsers()]);
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const grantVip = async (u: ProfileRow, days: number) => {
    setActingUserId(u.id);
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + days);
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: true, premium_expires_at: expires.toISOString() })
        .eq("id", u.id);
      if (error) throw error;
      toast({ title: "VIP Granted", description: `${u.email ?? "User"} is now Premium for ${days} days.` });
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setActingUserId(null);
    }
  };

  const revokeVip = async (u: ProfileRow) => {
    setActingUserId(u.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: false, premium_expires_at: null })
        .eq("id", u.id);
      if (error) throw error;
      toast({ title: "VIP Revoked", description: `${u.email ?? "User"} is no longer Premium.` });
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setActingUserId(null);
    }
  };

  const toggleBan = async (u: ProfileRow) => {
    setActingUserId(u.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: !u.is_banned })
        .eq("id", u.id);
      if (error) throw error;
      toast({
        title: u.is_banned ? "User Unbanned" : "User Banned",
        description: u.email ?? "User updated.",
      });
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setActingUserId(null);
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
  };

  const premiumCount = users.filter((u) => u.is_premium).length;
  const freeCount = users.length - premiumCount;

  const filteredUsers = users
    .filter((u) =>
      userFilter === "all" ? true : userFilter === "premium" ? u.is_premium : !u.is_premium
    )
    .filter((u) =>
      !search ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const formatExpiry = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (d < new Date()) return `Expired ${d.toLocaleDateString()}`;
    return `Until ${d.toLocaleDateString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">ADMIN</span>
          <button onClick={() => signOut().then(() => (window.location.href = "/"))} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => setTab("payments")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              tab === "payments" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <CreditCard className="mr-1 inline h-4 w-4" />
            Payments
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              tab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Users className="mr-1 inline h-4 w-4" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setTab("notify")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              tab === "notify" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Bell className="mr-1 inline h-4 w-4" />
            Notify
          </button>
        </div>

        {tab === "notify" && <SendNotificationTab />}

        {tab === "payments" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-4 text-center">
                <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <CreditCard className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <div className="text-xl font-bold">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Verification (4.99 USDT / 1 week)
              </h2>

              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : requests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No pending payment requests.
                </div>
              ) : (
                requests.map((req) => {
                  const prof = profilesById[req.user_id];
                  return (
                    <div key={req.id} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{prof?.email ?? req.user_id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                            req.status === "pending"
                              ? "bg-secondary text-foreground"
                              : req.status === "approved"
                              ? "bg-primary text-primary-foreground"
                              : "bg-destructive text-destructive-foreground"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <button
                        onClick={() => signedUrls[req.id] && setSelectedImg(signedUrls[req.id])}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ImageIcon className="h-4 w-4" />
                        View Payment Screenshot
                      </button>

                      {req.status === "pending" && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handlePaymentAction(req, "approved")}
                            disabled={actingId === req.id}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            {actingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Approve (7d VIP)
                          </button>
                          <button
                            onClick={() => handlePaymentAction(req, "rejected")}
                            disabled={actingId === req.id}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-4 text-center">
                <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <div className="text-xl font-bold">{users.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <Crown className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <div className="text-xl font-bold">{premiumCount}</div>
                <div className="text-xs text-muted-foreground">Premium</div>
              </div>
              <div className="rounded-lg border border-border p-4 text-center">
                <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <div className="text-xl font-bold">{freeCount}</div>
                <div className="text-xs text-muted-foreground">Free</div>
              </div>
            </div>

            <div className="flex gap-2 rounded-lg border border-border p-1">
              {(["all", "premium", "free"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setUserFilter(f)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition-colors ${
                    userFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />

            {loadingUsers ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{u.email ?? u.display_name ?? u.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </div>
                      {u.premium_expires_at && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatExpiry(u.premium_expires_at)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {u.is_premium && (
                        <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                          <Crown className="h-3 w-3" /> VIP
                        </span>
                      )}
                      {u.is_banned && (
                        <span className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                          <Ban className="h-3 w-3" /> Banned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {u.is_premium ? (
                      <button
                        onClick={() => revokeVip(u)}
                        disabled={actingUserId === u.id}
                        className="flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Revoke VIP
                      </button>
                    ) : (
                      <button
                        onClick={() => grantVip(u, 7)}
                        disabled={actingUserId === u.id}
                        className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {actingUserId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                        Grant VIP (7d)
                      </button>
                    )}

                    <button
                      onClick={() => toggleBan(u)}
                      disabled={actingUserId === u.id}
                      className={`flex items-center justify-center gap-1.5 rounded-md border py-2 text-xs font-semibold disabled:opacity-50 ${
                        u.is_banned
                          ? "border-border text-muted-foreground hover:bg-secondary"
                          : "border-destructive text-destructive hover:bg-destructive/10"
                      }`}
                    >
                      {u.is_banned ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      {u.is_banned ? "Unban" : "Ban User"}
                    </button>
                  </div>

                  {!u.is_premium && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => grantVip(u, 30)}
                        disabled={actingUserId === u.id}
                        className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        +30 days
                      </button>
                      <button
                        onClick={() => grantVip(u, 90)}
                        disabled={actingUserId === u.id}
                        className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        +90 days
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {selectedImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setSelectedImg(null)}
        >
          <img src={selectedImg} alt="Payment screenshot" className="max-h-[80vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
