export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      binance_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          merchant_trade_no: string
          paid_at: string | null
          prepay_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          merchant_trade_no: string
          paid_at?: string | null
          prepay_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          merchant_trade_no?: string
          paid_at?: string | null
          prepay_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chart_analyses: {
        Row: {
          analysis: Json
          created_at: string
          id: string
          image_path: string | null
          news_context: string | null
          user_id: string
        }
        Insert: {
          analysis: Json
          created_at?: string
          id?: string
          image_path?: string | null
          news_context?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json
          created_at?: string
          id?: string
          image_path?: string | null
          news_context?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discipline_events: {
        Row: {
          created_at: string
          id: string
          journal_entry_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      discipline_scores: {
        Row: {
          current_streak: number
          level: number
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          level?: number
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          level?: number
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          ai_review: string | null
          chart_analysis: string | null
          chart_image_url: string | null
          created_at: string
          direction: string
          entry_price: number | null
          id: string
          lot_size: number | null
          notes: string
          outcome: Database["public"]["Enums"]["trade_outcome"]
          pair: string
          pnl: number | null
          risk_percent: number | null
          risk_reward: number | null
          sentiment: Database["public"]["Enums"]["sentiment_type"] | null
          stop_loss: number | null
          strategy: string | null
          tags: string[] | null
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_review?: string | null
          chart_analysis?: string | null
          chart_image_url?: string | null
          created_at?: string
          direction: string
          entry_price?: number | null
          id?: string
          lot_size?: number | null
          notes: string
          outcome?: Database["public"]["Enums"]["trade_outcome"]
          pair: string
          pnl?: number | null
          risk_percent?: number | null
          risk_reward?: number | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          stop_loss?: number | null
          strategy?: string | null
          tags?: string[] | null
          take_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_review?: string | null
          chart_analysis?: string | null
          chart_image_url?: string | null
          created_at?: string
          direction?: string
          entry_price?: number | null
          id?: string
          lot_size?: number | null
          notes?: string
          outcome?: Database["public"]["Enums"]["trade_outcome"]
          pair?: string
          pnl?: number | null
          risk_percent?: number | null
          risk_reward?: number | null
          sentiment?: Database["public"]["Enums"]["sentiment_type"] | null
          stop_loss?: number | null
          strategy?: string | null
          tags?: string[] | null
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      news_events: {
        Row: {
          actual: string | null
          country: string | null
          created_at: string
          currency: string | null
          event_time: string
          external_id: string | null
          forecast: string | null
          id: string
          impact: string
          notified: boolean
          previous: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          event_time: string
          external_id?: string | null
          forecast?: string | null
          id?: string
          impact: string
          notified?: boolean
          previous?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          event_time?: string
          external_id?: string | null
          forecast?: string | null
          id?: string
          impact?: string
          notified?: boolean
          previous?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          created_at: string
          delivered_count: number
          id: string
          recipient_count: number
          recipient_filter: string
          sender_id: string | null
          source: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          delivered_count?: number
          id?: string
          recipient_count?: number
          recipient_filter: string
          sender_id?: string | null
          source?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          delivered_count?: number
          id?: string
          recipient_count?: number
          recipient_filter?: string
          sender_id?: string | null
          source?: string
          title?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_banned: boolean
          is_premium: boolean
          premium_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_banned?: boolean
          is_premium?: boolean
          premium_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          is_premium?: boolean
          premium_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prop_firm_accounts: {
        Row: {
          account_size: number
          created_at: string
          current_balance: number
          daily_drawdown_limit: number
          firm_name: string
          id: string
          max_drawdown_limit: number
          profit_target: number
          start_date: string
          starting_balance: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_size: number
          created_at?: string
          current_balance: number
          daily_drawdown_limit: number
          firm_name: string
          id?: string
          max_drawdown_limit: number
          profit_target: number
          start_date?: string
          starting_balance: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_size?: number
          created_at?: string
          current_balance?: number
          daily_drawdown_limit?: number
          firm_name?: string
          id?: string
          max_drawdown_limit?: number
          profit_target?: number
          start_date?: string
          starting_balance?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prop_firm_daily_stats: {
        Row: {
          account_id: string
          created_at: string
          drawdown_pct: number
          ending_balance: number
          id: string
          pnl: number
          starting_balance: number
          stat_date: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          drawdown_pct?: number
          ending_balance: number
          id?: string
          pnl?: number
          starting_balance: number
          stat_date: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          drawdown_pct?: number
          ending_balance?: number
          id?: string
          pnl?: number
          starting_balance?: number
          stat_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_firm_daily_stats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "prop_firm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      psych_audits: {
        Row: {
          biases: Json
          created_at: string
          id: string
          score: number
          summary: string
          trade_count_at_audit: number
          user_id: string
        }
        Insert: {
          biases?: Json
          created_at?: string
          id?: string
          score?: number
          summary: string
          trade_count_at_audit?: number
          user_id: string
        }
        Update: {
          biases?: Json
          created_at?: string
          id?: string
          score?: number
          summary?: string
          trade_count_at_audit?: number
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          created_at: string
          telegram_id: number
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          telegram_id: number
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          telegram_id?: number
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_view: {
        Row: {
          display_name: string | null
          level: number | null
          longest_streak: number | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      expire_premium_users: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payment_status: "pending" | "approved" | "rejected"
      sentiment_type: "Calm" | "Greedy" | "Anxious"
      trade_outcome: "WIN" | "LOSS" | "BREAKEVEN" | "OPEN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      payment_status: ["pending", "approved", "rejected"],
      sentiment_type: ["Calm", "Greedy", "Anxious"],
      trade_outcome: ["WIN", "LOSS", "BREAKEVEN", "OPEN"],
    },
  },
} as const
