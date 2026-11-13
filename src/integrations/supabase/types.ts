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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      breakout_score_runs: {
        Row: {
          computed_at: string
          cutoff_week: number
          player_count: number
          season: number
        }
        Insert: {
          computed_at?: string
          cutoff_week: number
          player_count?: number
          season: number
        }
        Update: {
          computed_at?: string
          cutoff_week?: number
          player_count?: number
          season?: number
        }
        Relationships: []
      }
      breakout_scores: {
        Row: {
          avg_snap_pct: number
          breakout_score: number
          cutoff_week: number
          efficiency_score: number
          games: number
          headshot_url: string | null
          opportunity_score: number
          player_id: string
          player_name: string
          position: string
          ppg: number
          rank: number
          role_score: number
          season: number
          team: string
        }
        Insert: {
          avg_snap_pct: number
          breakout_score: number
          cutoff_week: number
          efficiency_score: number
          games: number
          headshot_url?: string | null
          opportunity_score: number
          player_id: string
          player_name: string
          position: string
          ppg: number
          rank: number
          role_score: number
          season: number
          team: string
        }
        Update: {
          avg_snap_pct?: number
          breakout_score?: number
          cutoff_week?: number
          efficiency_score?: number
          games?: number
          headshot_url?: string | null
          opportunity_score?: number
          player_id?: string
          player_name?: string
          position?: string
          ppg?: number
          rank?: number
          role_score?: number
          season?: number
          team?: string
        }
        Relationships: []
      }
      player_weeks: {
        Row: {
          carries: number | null
          fantasy_points_ppr: number | null
          headshot_url: string | null
          offense_pct: number | null
          offense_snaps: number | null
          player_id: string
          player_name: string
          position: string
          receiving_epa: number | null
          receiving_yards: number | null
          receptions: number | null
          rushing_epa: number | null
          rushing_yards: number | null
          season: number
          target_share: number | null
          targets: number | null
          team: string
          week: number
          wopr: number | null
        }
        Insert: {
          carries?: number | null
          fantasy_points_ppr?: number | null
          headshot_url?: string | null
          offense_pct?: number | null
          offense_snaps?: number | null
          player_id: string
          player_name: string
          position: string
          receiving_epa?: number | null
          receiving_yards?: number | null
          receptions?: number | null
          rushing_epa?: number | null
          rushing_yards?: number | null
          season: number
          target_share?: number | null
          targets?: number | null
          team: string
          week: number
          wopr?: number | null
        }
        Update: {
          carries?: number | null
          fantasy_points_ppr?: number | null
          headshot_url?: string | null
          offense_pct?: number | null
          offense_snaps?: number | null
          player_id?: string
          player_name?: string
          position?: string
          receiving_epa?: number | null
          receiving_yards?: number | null
          receptions?: number | null
          rushing_epa?: number | null
          rushing_yards?: number | null
          season?: number
          target_share?: number | null
          targets?: number | null
          team?: string
          week?: number
          wopr?: number | null
        }
        Relationships: []
      }
      scouting_generation_locks: {
        Row: {
          cutoff_week: number
          player_id: string
          season: number
          started_at: string
        }
        Insert: {
          cutoff_week: number
          player_id: string
          season: number
          started_at?: string
        }
        Update: {
          cutoff_week?: number
          player_id?: string
          season?: number
          started_at?: string
        }
        Relationships: []
      }
      scouting_reports: {
        Row: {
          cutoff_week: number
          generated_at: string
          id: string
          model: string
          player_id: string
          risks: string
          season: number
          verdict: string
          why_on_radar: string
        }
        Insert: {
          cutoff_week: number
          generated_at?: string
          id?: string
          model: string
          player_id: string
          risks: string
          season: number
          verdict: string
          why_on_radar: string
        }
        Update: {
          cutoff_week?: number
          generated_at?: string
          id?: string
          model?: string
          player_id?: string
          risks?: string
          season?: number
          verdict?: string
          why_on_radar?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouting_reports_season_cutoff_week_player_id_fkey"
            columns: ["season", "cutoff_week", "player_id"]
            isOneToOne: false
            referencedRelation: "breakout_scores"
            referencedColumns: ["season", "cutoff_week", "player_id"]
          },
        ]
      }
      season_syncs: {
        Row: {
          completed_at: string | null
          latest_week: number | null
          message: string | null
          row_count: number
          season: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          latest_week?: number | null
          message?: string | null
          row_count?: number
          season: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          latest_week?: number | null
          message?: string | null
          row_count?: number
          season?: number
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_scouting_generation: {
        Args: { p_cutoff_week: number; p_player_id: string; p_season: number }
        Returns: boolean
      }
      claim_season_sync: { Args: { p_season: number }; Returns: boolean }
      save_breakout_scores: {
        Args: { p_cutoff_week: number; p_scores: Json; p_season: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
