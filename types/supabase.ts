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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_rooms: {
        Row: {
          id: string
          is_group: boolean | null
          name: string | null
        }
        Insert: {
          id?: string
          is_group?: boolean | null
          name?: string | null
        }
        Update: {
          id?: string
          is_group?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          gym_id: string | null
          gym_type: string | null
          id: string
          member_count: number | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          gym_id?: string | null
          gym_type?: string | null
          id?: string
          member_count?: number | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          gym_id?: string | null
          gym_type?: string | null
          id?: string
          member_count?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string | null
          monitor_consent_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string | null
          monitor_consent_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string | null
          monitor_consent_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          gym_id: string | null
          id: string
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gym_id?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gym_id?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_exercises: {
        Row: {
          created_at: string | null
          id: string
          muscle: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          muscle?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          muscle?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gyms: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          display_key: string | null
          id: string
          is_verified: boolean | null
          location: unknown
          name: string
          source: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          display_key?: string | null
          id?: string
          is_verified?: boolean | null
          location?: unknown
          name: string
          source?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          display_key?: string | null
          id?: string
          is_verified?: boolean | null
          location?: unknown
          name?: string
          source?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_id: string
          type: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id: string
          type?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_tracking_enabled: boolean | null
          avatar_url: string | null
          bio: string | null
          gym_id: string | null
          home_gym_id: string | null
          id: string
          is_super_admin: boolean | null
          name: string | null
          privacy_settings: Json | null
          updated_at: string
          username: string
        }
        Insert: {
          auto_tracking_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          gym_id?: string | null
          home_gym_id?: string | null
          id: string
          is_super_admin?: boolean | null
          name?: string | null
          privacy_settings?: Json | null
          updated_at?: string
          username: string
        }
        Update: {
          auto_tracking_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          gym_id?: string | null
          home_gym_id?: string | null
          id?: string
          is_super_admin?: boolean | null
          name?: string | null
          privacy_settings?: Json | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_gym_id_fkey"
            columns: ["home_gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          room_id: string
          user_id: string
        }
        Insert: {
          room_id: string
          user_id: string
        }
        Update: {
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gyms: {
        Row: {
          created_at: string | null
          gym_id: string
          is_default: boolean | null
          label: string | null
          radius: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gym_id: string
          is_default?: boolean | null
          label?: string | null
          radius?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gym_id?: string
          is_default?: boolean | null
          label?: string | null
          radius?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gyms_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          sets: Json | null
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          sets?: Json | null
          workout_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          sets?: Json | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          auto_closed: boolean | null
          created_at: string
          duration: number | null
          end_time: string | null
          group_id: string | null
          gym_id: string | null
          id: string
          start_time: string
          status: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          auto_closed?: boolean | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          group_id?: string | null
          gym_id?: string | null
          id?: string
          start_time: string
          status?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          auto_closed?: boolean | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          group_id?: string | null
          gym_id?: string | null
          id?: string
          start_time?: string
          status?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string | null
          exercises: Json
          id: string
          name: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          exercises?: Json
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          exercises?: Json
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string | null
          duration: number | null
          end_time: string | null
          id: string
          name: string
          start_time: string
          template_id: string | null
          user_id: string
          visibility: string | null
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          name: string
          start_time: string
          template_id?: string | null
          user_id: string
          visibility?: string | null
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          name?: string
          start_time?: string
          template_id?: string | null
          user_id?: string
          visibility?: string | null
          volume?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_search_users: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          email: string
          handle: string
          id: string
          is_super_admin: boolean
          name: string
        }[]
      }
      cleanup_my_data: { Args: never; Returns: undefined }
      cleanup_stale_sessions: {
        Args: { timeout_minutes?: number }
        Returns: number
      }
      delete_workout: {
        Args: { target_workout_id: string }
        Returns: undefined
      }
      get_gym_coordinates: {
        Args: { gym_ids: string[] }
        Returns: {
          id: string
          latitude: number
          longitude: number
        }[]
      }
      get_gym_leaderboard: {
        Args: { p_display_key: string; p_gym_id: string }
        Returns: {
          category: string
          rank: number
          user_avatar: string
          user_name: string
          value: string
        }[]
      }
      get_gyms_nearby: {
        Args: { lat: number; lng: number; radius_meters: number }
        Returns: {
          dist_meters: number
          id: string
          name: string
        }[]
      }
      get_live_gym_activity: {
        Args: { p_display_key: string; p_gym_id: string }
        Returns: {
          avatar_url: string
          current_exercise: string
          current_set: number
          started_at: string
          user_id: string
          username: string
        }[]
      }
      get_platform_stats: {
        Args: never
        Returns: {
          active_workouts_now: number
          total_gyms: number
          total_users: number
          verified_gyms: number
        }[]
      }
      is_chat_member: { Args: { _conversation_id: string }; Returns: boolean }
      is_participant: { Args: { _conversation_id: string }; Returns: boolean }
      verify_gym_display_key: {
        Args: { p_gym_id: string; p_key: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
