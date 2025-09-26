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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      dungeon_attempts: {
        Row: {
          attempted_at: string
          dungeon_id: string
          id: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["attempt_status"]
          team_id: string
        }
        Insert: {
          attempted_at?: string
          dungeon_id: string
          id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["attempt_status"]
          team_id: string
        }
        Update: {
          attempted_at?: string
          dungeon_id?: string
          id?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["attempt_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dungeon_attempts_dungeon_id_fkey"
            columns: ["dungeon_id"]
            isOneToOne: false
            referencedRelation: "dungeons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dungeon_attempts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      dungeons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          min_level: number
          name: string
          rank: Database["public"]["Enums"]["dungeon_rank"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          min_level?: number
          name: string
          rank: Database["public"]["Enums"]["dungeon_rank"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          min_level?: number
          name?: string
          rank?: Database["public"]["Enums"]["dungeon_rank"]
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          team_id: string
          name: string
          character_class: Database["public"]["Enums"]["character_class"]
          health: number
          mana: number
          attack: number
          defense: number
          equipped_skill: string | null
          equipped_artifacts: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          character_class: Database["public"]["Enums"]["character_class"]
          health?: number
          mana?: number
          attack?: number
          defense?: number
          equipped_skill?: string | null
          equipped_artifacts?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          character_class?: Database["public"]["Enums"]["character_class"]
          health?: number
          mana?: number
          attack?: number
          defense?: number
          equipped_skill?: string | null
          equipped_artifacts?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [{
          foreignKeyName: "players_team_id_fkey"
          columns: ["team_id"]
          referencedRelation: "teams"
          referencedColumns: ["id"]
        }]
      }
      inventory: {
        Row: {
          description: string | null
          id: string
          item_name: string
          item_type: Database["public"]["Enums"]["item_type"]
          obtained_at: string
          obtained_from: string | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          stats: Json | null
          team_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          item_name: string
          item_type: Database["public"]["Enums"]["item_type"]
          obtained_at?: string
          obtained_from?: string | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          stats?: Json | null
          team_id: string
        }
        Update: {
          description?: string | null
          id?: string
          item_name?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          obtained_at?: string
          obtained_from?: string | null
          rarity?: Database["public"]["Enums"]["item_rarity"]
          stats?: Json | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_obtained_from_fkey"
            columns: ["obtained_from"]
            isOneToOne: false
            referencedRelation: "dungeon_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          stamina: number
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          stamina?: number
          team_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          stamina?: number
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_updated_at_column: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      attempt_status: "pending" | "approved" | "rejected"
      character_class: 
        | "fighter"
        | "tank"
        | "healer"
        | "assassin"
        | "mage"
        | "ranger"
      dungeon_rank: "E" | "D" | "C" | "B" | "A" | "S"
      item_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      item_type: "skill" | "artifact" | "set_piece"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      attempt_status: ["pending", "approved", "rejected"],
      character_class: [
        "fighter",
        "tank",
        "healer",
        "assassin",
        "mage",
        "ranger",
      ],
      dungeon_rank: ["E", "D", "C", "B", "A", "S"],
      item_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      item_type: ["skill", "artifact", "set_piece"],
    },
  },
} as const
