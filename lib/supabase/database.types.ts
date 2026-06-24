export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          cycle_mode: string | null
          deleted_at: string | null
          group_id: string
          id: string
          is_notify_enabled: boolean
          name: string
          next_order_date: string | null
          notify_snoozed_until: string | null
          status: string | null
          tracking_scope: string
        }
        Insert: {
          created_at?: string
          cycle_mode?: string | null
          deleted_at?: string | null
          group_id: string
          id?: string
          is_notify_enabled?: boolean
          name: string
          next_order_date?: string | null
          notify_snoozed_until?: string | null
          status?: string | null
          tracking_scope?: string
        }
        Update: {
          created_at?: string
          cycle_mode?: string | null
          deleted_at?: string | null
          group_id?: string
          id?: string
          is_notify_enabled?: boolean
          name?: string
          next_order_date?: string | null
          notify_snoozed_until?: string | null
          status?: string | null
          tracking_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          delivery_status: string | null
          group_id: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_status?: string | null
          group_id: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_status?: string | null
          group_id?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_unit: string | null
          category_id: string | null
          created_at: string
          cycle_mode: string
          default_units_per_pack: number | null
          deleted_at: string | null
          group_id: string
          id: string
          is_notify_enabled: boolean
          name: string
          next_order_date: string | null
          notify_snoozed_until: string | null
          per_unit_cycle_days: number | null
          purchase_url: string | null
          status: string
          type: string
        }
        Insert: {
          base_unit?: string | null
          category_id?: string | null
          created_at?: string
          cycle_mode?: string
          default_units_per_pack?: number | null
          deleted_at?: string | null
          group_id: string
          id?: string
          is_notify_enabled?: boolean
          name: string
          next_order_date?: string | null
          notify_snoozed_until?: string | null
          per_unit_cycle_days?: number | null
          purchase_url?: string | null
          status?: string
          type?: string
        }
        Update: {
          base_unit?: string | null
          category_id?: string | null
          created_at?: string
          cycle_mode?: string
          default_units_per_pack?: number | null
          deleted_at?: string | null
          group_id?: string
          id?: string
          is_notify_enabled?: boolean
          name?: string
          next_order_date?: string | null
          notify_snoozed_until?: string | null
          per_unit_cycle_days?: number | null
          purchase_url?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          group_id: string
          id: string
          notify_time: string | null
          timezone: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          group_id: string
          id: string
          notify_time?: string | null
          timezone?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          group_id?: string
          id?: string
          notify_time?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_logs: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          pack_quantity: number
          platform: string | null
          price: number
          product_id: string
          purchase_url: string | null
          purchased_at: string
          total_units: number
          unit_price: number
          units_per_pack: number
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          pack_quantity?: number
          platform?: string | null
          price: number
          product_id: string
          purchase_url?: string | null
          purchased_at?: string
          total_units: number
          unit_price: number
          units_per_pack?: number
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          pack_quantity?: number
          platform?: string | null
          price?: number
          product_id?: string
          purchase_url?: string | null
          purchased_at?: string
          total_units?: number
          unit_price?: number
          units_per_pack?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          last_used_at: string | null
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_group_id: { Args: never; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

