import { useEffect, useState } from "react";
import { Send, Loader2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LogRow {
  id: string;
  title: string;
  body: string;
  recipient_filter: string;
  recipient_count: number;
  delivered_count: number;
  source: string;
  created_at: string;
}

const SendNotificationTab = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [recipient, setRecipient] = useState<"all" | "premium">("all");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("notification_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((data ?? []) as LogRow[]);
  };

  useEffect(() => { loadLogs(); }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Title နဲ့ Message ဖြည့်ပါ", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: { title, body, url, recipient },
    });
    setSending(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "📤 Notification sent",
      description: `Delivered ${data?.delivered ?? 0} / ${data?.total ?? 0}`,
    });
    setTitle(""); setBody("");
    loadLogs();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4" /> Send Push Notification
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. 🚀 New Signal)"
          maxLength={60}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message body..."
          maxLength={200}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Open URL on click (e.g. /journal)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />

        <div className="flex gap-2">
          {(["all", "premium"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRecipient(r)}
              className={`flex-1 rounded-md py-2 text-xs font-semibold capitalize ${
                recipient === r ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
              }`}
            >
              {r === "all" ? "All Users" : "Premium Only"}
            </button>
          ))}
        </div>

        <button
          onClick={send}
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Now
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Sent ({logs.length})
        </h3>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No notifications sent yet.
            </div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{l.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{l.body}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold">
                    {l.delivered_count}/{l.recipient_count}
                  </span>
                </div>
                <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                  <span>{l.source}</span>·<span>{l.recipient_filter}</span>·
                  <span>{new Date(l.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SendNotificationTab;
