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
      companies: {
        Row: {
          created_at: string
          daily_rate: number
          id: string
          name: string
          overtime_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_rate: number
          id?: string
          name: string
          overtime_rate: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_rate?: number
          id?: string
          name?: string
          overtime_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_qr_settings: {
        Row: {
          company_id: string
          created_at: string
          geo_enabled: boolean
          id: string
          latitude: number | null
          longitude: number | null
          qr_code_token: string
          qr_code_version: number
          qr_enabled: boolean
          radius_meters: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          geo_enabled?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          qr_code_token: string
          qr_code_version?: number
          qr_enabled?: boolean
          radius_meters?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          geo_enabled?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          qr_code_token?: string
          qr_code_version?: number
          qr_enabled?: boolean
          radius_meters?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_qr_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_work_locations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          work_location_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          work_location_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          work_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_work_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_work_locations_work_location_id_fkey"
            columns: ["work_location_id"]
            isOneToOne: false
            referencedRelation: "work_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          birth_date: string | null
          company_id: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          personal_email: string | null
          phone: string | null
          photo_url: string | null
          position_id: string | null
          updated_at: string
          user_id: string | null
          work_location: Database["public"]["Enums"]["work_location"] | null
          work_unit: Database["public"]["Enums"]["work_unit"][] | null
        }
        Insert: {
          birth_date?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          personal_email?: string | null
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: Database["public"]["Enums"]["work_location"] | null
          work_unit?: Database["public"]["Enums"]["work_unit"][] | null
        }
        Update: {
          birth_date?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          personal_email?: string | null
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: Database["public"]["Enums"]["work_location"] | null
          work_unit?: Database["public"]["Enums"]["work_unit"][] | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_positions: {
        Row: {
          company_id: string
          created_at: string
          daily_rate: number
          id: string
          name: string
          overtime_rate: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_rate: number
          id?: string
          name: string
          overtime_rate: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_rate?: number
          id?: string
          name?: string
          overtime_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      point_validation_logs: {
        Row: {
          created_at: string
          distance_meters: number | null
          employee_id: string
          error_message: string | null
          id: string
          latitude: number | null
          longitude: number | null
          qr_code_provided: string | null
          validation_status: string
          validation_type: string
        }
        Insert: {
          created_at?: string
          distance_meters?: number | null
          employee_id: string
          error_message?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          qr_code_provided?: string | null
          validation_status: string
          validation_type: string
        }
        Update: {
          created_at?: string
          distance_meters?: number | null
          employee_id?: string
          error_message?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          qr_code_provided?: string | null
          validation_status?: string
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_validation_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      route_permissions: {
        Row: {
          created_at: string
          id: string
          label: string
          role: Database["public"]["Enums"]["app_role"]
          route: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          role: Database["public"]["Enums"]["app_role"]
          route: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          role?: Database["public"]["Enums"]["app_role"]
          route?: string
        }
        Relationships: []
      }
      time_records: {
        Row: {
          created_at: string
          daily_value: number | null
          date: string
          employee_id: string
          entry_time: string
          exit_time: string | null
          id: string
          lunch_discount: number | null
          lunch_exit_time: string | null
          lunch_hours: number | null
          lunch_return_time: string | null
          overtime_value: number | null
          setor: Database["public"]["Enums"]["setor_type"] | null
          total_value: number | null
          updated_at: string
          work_location_id: string | null
          worked_hours: number | null
        }
        Insert: {
          created_at?: string
          daily_value?: number | null
          date: string
          employee_id: string
          entry_time: string
          exit_time?: string | null
          id?: string
          lunch_discount?: number | null
          lunch_exit_time?: string | null
          lunch_hours?: number | null
          lunch_return_time?: string | null
          overtime_value?: number | null
          setor?: Database["public"]["Enums"]["setor_type"] | null
          total_value?: number | null
          updated_at?: string
          work_location_id?: string | null
          worked_hours?: number | null
        }
        Update: {
          created_at?: string
          daily_value?: number | null
          date?: string
          employee_id?: string
          entry_time?: string
          exit_time?: string | null
          id?: string
          lunch_discount?: number | null
          lunch_exit_time?: string | null
          lunch_hours?: number | null
          lunch_return_time?: string | null
          overtime_value?: number | null
          setor?: Database["public"]["Enums"]["setor_type"] | null
          total_value?: number | null
          updated_at?: string
          work_location_id?: string | null
          worked_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_records_work_location_id_fkey"
            columns: ["work_location_id"]
            isOneToOne: false
            referencedRelation: "work_locations"
            referencedColumns: ["id"]
          },
        ]
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
      work_locations: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          geo_enabled: boolean
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          qr_code_token: string
          qr_code_version: number
          qr_enabled: boolean
          radius_meters: number | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          geo_enabled?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          qr_code_token?: string
          qr_code_version?: number
          qr_enabled?: boolean
          radius_meters?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          geo_enabled?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          qr_code_token?: string
          qr_code_version?: number
          qr_enabled?: boolean
          radius_meters?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
    }
    Enums: {
      app_role: "admin" | "user" | "dev" | "inputer"
      setor_type: "Logística" | "Qualidade"
      work_location: "Matriz" | "Filial" | "Ambas"
      work_unit: "Matriz" | "Filial"
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
      app_role: ["admin", "user", "dev", "inputer"],
      setor_type: ["Logística", "Qualidade"],
      work_location: ["Matriz", "Filial", "Ambas"],
      work_unit: ["Matriz", "Filial"],
    },
  },
} as const
