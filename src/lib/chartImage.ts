import { supabase } from "@/integrations/supabase/client";

// The journal-charts bucket is private: turn a stored path or old public URL into a signed URL.
export const toChartPath = (stored: string) => {
  const marker = "/journal-charts/";
  const i = stored.indexOf(marker);
  return i >= 0 ? decodeURIComponent(stored.slice(i + marker.length).split("?")[0]) : stored;
};

export const signedChartUrl = async (stored: string | null | undefined): Promise<string | null> => {
  if (!stored) return null;
  const { data } = await supabase.storage.from("journal-charts").createSignedUrl(toChartPath(stored), 3600);
  return data?.signedUrl ?? null;
};
