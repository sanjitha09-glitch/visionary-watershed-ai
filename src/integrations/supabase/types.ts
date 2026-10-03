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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          id: string
          status: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          id?: string
          status?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          id?: string
          status?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          district_id: string
          id: string
          name: string
        }
        Insert: {
          district_id: string
          id: string
          name: string
        }
        Update: {
          district_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          id: string
          name: string
          state_id: string
        }
        Insert: {
          id: string
          name: string
          state_id: string
        }
        Update: {
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      field_images: {
        Row: {
          captured_at: string | null
          created_at: string
          device: string | null
          file_name: string
          id: string
          intervention_id: string | null
          lat: number | null
          lng: number | null
          location_source: string
          mime_type: string
          object_key: string
          observation: string | null
          sha256: string
          size_bytes: number
          sync_status: string
          uploaded_by: string
          watershed_id: string | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          device?: string | null
          file_name: string
          id?: string
          intervention_id?: string | null
          lat?: number | null
          lng?: number | null
          location_source?: string
          mime_type: string
          object_key: string
          observation?: string | null
          sha256: string
          size_bytes: number
          sync_status?: string
          uploaded_by: string
          watershed_id?: string | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          device?: string | null
          file_name?: string
          id?: string
          intervention_id?: string | null
          lat?: number | null
          lng?: number | null
          location_source?: string
          mime_type?: string
          object_key?: string
          observation?: string | null
          sha256?: string
          size_bytes?: number
          sync_status?: string
          uploaded_by?: string
          watershed_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_images_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_images_watershed_id_fkey"
            columns: ["watershed_id"]
            isOneToOne: false
            referencedRelation: "watersheds"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          data_origin: string
          evidence_count: number
          id: string
          implemented_on: string
          lat: number
          lng: number
          status: Database["public"]["Enums"]["monitoring_status"]
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at: string
          village: string
          watershed_id: string
        }
        Insert: {
          data_origin?: string
          evidence_count?: number
          id: string
          implemented_on: string
          lat: number
          lng: number
          status?: Database["public"]["Enums"]["monitoring_status"]
          type: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
          village: string
          watershed_id: string
        }
        Update: {
          data_origin?: string
          evidence_count?: number
          id?: string
          implemented_on?: string
          lat?: number
          lng?: number
          status?: Database["public"]["Enums"]["monitoring_status"]
          type?: Database["public"]["Enums"]["intervention_type"]
          updated_at?: string
          village?: string
          watershed_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventions_watershed_id_fkey"
            columns: ["watershed_id"]
            isOneToOne: false
            referencedRelation: "watersheds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_geography: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_geography?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_geography?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      states: {
        Row: {
          center_lat: number
          center_lng: number
          id: string
          name: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          id: string
          name: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watersheds: {
        Row: {
          area_ha: number
          block_id: string
          boundary: Json
          center_lat: number
          center_lng: number
          data_origin: string
          data_status: string
          drainage_km: number | null
          id: string
          name: string
          source: string
          updated_at: string
          water_bodies: number | null
        }
        Insert: {
          area_ha: number
          block_id: string
          boundary: Json
          center_lat: number
          center_lng: number
          data_origin?: string
          data_status?: string
          drainage_km?: number | null
          id: string
          name: string
          source?: string
          updated_at?: string
          water_bodies?: number | null
        }
        Update: {
          area_ha?: number
          block_id?: string
          boundary?: Json
          center_lat?: number
          center_lng?: number
          data_origin?: string
          data_status?: string
          drainage_km?: number | null
          id?: string
          name?: string
          source?: string
          updated_at?: string
          water_bodies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "watersheds_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "state_admin"
        | "district_officer"
        | "watershed_officer"
        | "field_monitor"
        | "analyst"
        | "viewer"
      intervention_type:
        | "check_dam"
        | "farm_pond"
        | "plantation"
        | "water_conservation"
        | "land_treatment"
        | "drainage_treatment"
        | "other"
      monitoring_status:
        | "monitored"
        | "requires_review"
        | "data_incomplete"
        | "analysis_available"
        | "pending_validation"
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
      app_role: [
        "super_admin",
        "state_admin",
        "district_officer",
        "watershed_officer",
        "field_monitor",
        "analyst",
        "viewer",
      ],
      intervention_type: [
        "check_dam",
        "farm_pond",
        "plantation",
        "water_conservation",
        "land_treatment",
        "drainage_treatment",
        "other",
      ],
      monitoring_status: [
        "monitored",
        "requires_review",
        "data_incomplete",
        "analysis_available",
        "pending_validation",
      ],
    },
  },
} as const
