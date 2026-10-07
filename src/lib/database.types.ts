// Mirrors supabase/migrations. Regenerate after schema changes with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
// (or --local when running the local stack).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export interface Database {
  public: {
    Tables: {
      cycles: {
        Row: {
          id: string;
          user_id: string;
          start_date: string;
          end_date: string | null;
          cycle_length: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          start_date: string;
          end_date?: string | null;
          cycle_length?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cycles']['Insert']>;
        Relationships: [];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          flow_intensity: FlowIntensity | null;
          mood: string | null;
          symptoms: string[];
          water_intake: number | null;
          sleep_hours: number | null;
          energy_level: number | null;
          rested: boolean | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date: string;
          flow_intensity?: FlowIntensity | null;
          mood?: string | null;
          symptoms?: string[];
          water_intake?: number | null;
          sleep_hours?: number | null;
          energy_level?: number | null;
          rested?: boolean | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['daily_logs']['Insert']>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          display_name: string | null;
          average_cycle_length: number;
          average_period_length: number;
          use_computed_averages: boolean;
          timezone: string;
          notifications_enabled: boolean;
          morning_time: string;
          notify_phase_changes: boolean;
          notify_period_forecast: boolean;
          notify_daily_checkin: boolean;
          checkin_time: string;
          notify_hydration: boolean;
          hydration_times: string[];
          notify_sleep: boolean;
          sleep_time: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['user_settings']['Row']>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          keys: Json;
          user_agent: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          endpoint: string;
          keys: Json;
          user_agent?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      register_push_subscription: {
        Args: { p_endpoint: string; p_keys: Json; p_user_agent?: string | null };
        Returns: undefined;
      };
    };
    Enums: { flow_intensity: FlowIntensity };
    CompositeTypes: { [_ in never]: never };
  };
}

type Tables = Database['public']['Tables'];
export type Cycle = Tables['cycles']['Row'];
export type DailyLog = Tables['daily_logs']['Row'];
export type DailyLogInput = Tables['daily_logs']['Insert'];
export type UserSettings = Tables['user_settings']['Row'];
export type UserSettingsUpdate = Tables['user_settings']['Update'];
