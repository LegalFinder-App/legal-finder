export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string;
          client_name: string | null;
          created_at: string;
          duration_minutes: number;
          id: string;
          lawyer_id: string;
          lawyer_name: string | null;
          mode: string;
          notes: string | null;
          scheduled_at: string;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          client_name?: string | null;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          lawyer_id: string;
          lawyer_name?: string | null;
          mode?: string;
          notes?: string | null;
          scheduled_at: string;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          client_name?: string | null;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          lawyer_id?: string;
          lawyer_name?: string | null;
          mode?: string;
          notes?: string | null;
          scheduled_at?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      case_updates: {
        Row: {
          author_id: string;
          author_name: string;
          case_id: string;
          created_at: string;
          id: string;
          note: string;
        };
        Insert: {
          author_id: string;
          author_name?: string;
          case_id: string;
          created_at?: string;
          id?: string;
          note: string;
        };
        Update: {
          author_id?: string;
          author_name?: string;
          case_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_updates_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          case_type: string;
          client_id: string;
          court: string | null;
          created_at: string;
          description: string | null;
          id: string;
          lawyer_id: string | null;
          next_hearing: string | null;
          priority: string;
          reference: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          case_type?: string;
          client_id: string;
          court?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          lawyer_id?: string | null;
          next_hearing?: string | null;
          priority?: string;
          reference?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          case_type?: string;
          client_id?: string;
          court?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          lawyer_id?: string | null;
          next_hearing?: string | null;
          priority?: string;
          reference?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message: string | null;
          last_message_at: string;
          participant_a: string;
          participant_b: string;
          subject: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message?: string | null;
          last_message_at?: string;
          participant_a: string;
          participant_b: string;
          subject?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message?: string | null;
          last_message_at?: string;
          participant_a?: string;
          participant_b?: string;
          subject?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          case_id: string | null;
          category: string;
          created_at: string;
          id: string;
          mime_type: string | null;
          name: string;
          owner_id: string;
          size_bytes: number | null;
          storage_path: string;
        };
        Insert: {
          case_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          name: string;
          owner_id: string;
          size_bytes?: number | null;
          storage_path: string;
        };
        Update: {
          case_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          name?: string;
          owner_id?: string;
          size_bytes?: number | null;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      incident_reports: {
        Row: {
          anonymous: boolean;
          category: string;
          created_at: string;
          description: string;
          id: string;
          location: string | null;
          occurred_at: string | null;
          officer_note: string | null;
          reference: string;
          reporter_id: string | null;
          reporter_name: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          anonymous?: boolean;
          category?: string;
          created_at?: string;
          description: string;
          id?: string;
          location?: string | null;
          occurred_at?: string | null;
          officer_note?: string | null;
          reference?: string;
          reporter_id?: string | null;
          reporter_name?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          anonymous?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          location?: string | null;
          occurred_at?: string | null;
          officer_note?: string | null;
          reference?: string;
          reporter_id?: string | null;
          reporter_name?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      judgements: {
        Row: {
          body: string | null;
          case_number: string;
          court: string;
          created_at: string;
          decided_on: string | null;
          file_url: string | null;
          id: string;
          judge: string | null;
          published: boolean;
          summary: string | null;
          title: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          body?: string | null;
          case_number: string;
          court: string;
          created_at?: string;
          decided_on?: string | null;
          file_url?: string | null;
          id?: string;
          judge?: string | null;
          published?: boolean;
          summary?: string | null;
          title: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          body?: string | null;
          case_number?: string;
          court?: string;
          created_at?: string;
          decided_on?: string | null;
          file_url?: string | null;
          id?: string;
          judge?: string | null;
          published?: boolean;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      lawyers: {
        Row: {
          accepting_clients: boolean;
          bar_number: string | null;
          bio: string | null;
          city: string | null;
          consultation_fee: number | null;
          county: string | null;
          created_at: string;
          email: string | null;
          firm: string | null;
          full_name: string;
          headline: string | null;
          hourly_rate: number | null;
          id: string;
          languages: string[];
          phone: string | null;
          photo_url: string | null;
          practice_areas: string[];
          rating: number;
          review_count: number;
          updated_at: string;
          user_id: string | null;
          verified: boolean;
          years_experience: number;
        };
        Insert: {
          accepting_clients?: boolean;
          bar_number?: string | null;
          bio?: string | null;
          city?: string | null;
          consultation_fee?: number | null;
          county?: string | null;
          created_at?: string;
          email?: string | null;
          firm?: string | null;
          full_name: string;
          headline?: string | null;
          hourly_rate?: number | null;
          id?: string;
          languages?: string[];
          phone?: string | null;
          photo_url?: string | null;
          practice_areas?: string[];
          rating?: number;
          review_count?: number;
          updated_at?: string;
          user_id?: string | null;
          verified?: boolean;
          years_experience?: number;
        };
        Update: {
          accepting_clients?: boolean;
          bar_number?: string | null;
          bio?: string | null;
          city?: string | null;
          consultation_fee?: number | null;
          county?: string | null;
          created_at?: string;
          email?: string | null;
          firm?: string | null;
          full_name?: string;
          headline?: string | null;
          hourly_rate?: number | null;
          id?: string;
          languages?: string[];
          phone?: string | null;
          photo_url?: string | null;
          practice_areas?: string[];
          rating?: number;
          review_count?: number;
          updated_at?: string;
          user_id?: string | null;
          verified?: boolean;
          years_experience?: number;
        };
        Relationships: [];
      };
      legal_advices: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          body: string;
          category: string;
          created_at: string;
          id: string;
          image_url: string | null;
          published: boolean;
          slug: string | null;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          author_name?: string | null;
          body: string;
          category?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          published?: boolean;
          slug?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string | null;
          body?: string;
          category?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          published?: boolean;
          slug?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      library_items: {
        Row: {
          author: string | null;
          category: string;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          file_url: string | null;
          id: string;
          title: string;
          year: number | null;
        };
        Insert: {
          author?: string | null;
          category?: string;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          file_url?: string | null;
          id?: string;
          title: string;
          year?: number | null;
        };
        Update: {
          author?: string | null;
          category?: string;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          file_url?: string | null;
          id?: string;
          title?: string;
          year?: number | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender_id: string;
          sender_name: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id: string;
          sender_name?: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id?: string;
          sender_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      news_posts: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          body: string;
          created_at: string;
          id: string;
          image_url: string | null;
          published: boolean;
          published_at: string;
          slug: string | null;
          source: string | null;
          summary: string | null;
          title: string;
        };
        Insert: {
          author_id?: string | null;
          author_name?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          published?: boolean;
          published_at?: string;
          slug?: string | null;
          source?: string | null;
          summary?: string | null;
          title: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          published?: boolean;
          published_at?: string;
          slug?: string | null;
          source?: string | null;
          summary?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          link: string | null;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      police_stations: {
        Row: {
          address: string | null;
          county: string | null;
          created_at: string;
          email: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
          phone: string | null;
        };
        Insert: {
          address?: string | null;
          county?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          phone?: string | null;
        };
        Update: {
          address?: string | null;
          county?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          phone: string | null;
          requested_role: Database["public"]["Enums"]["app_role"] | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id: string;
          phone?: string | null;
          requested_role?: Database["public"]["Enums"]["app_role"] | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
          requested_role?: Database["public"]["Enums"]["app_role"] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          author: string;
          created_at: string;
          id: string;
          text: string;
        };
        Insert: {
          author?: string;
          created_at?: string;
          id?: string;
          text: string;
        };
        Update: {
          author?: string;
          created_at?: string;
          id?: string;
          text?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          author_id: string;
          author_name: string;
          comment: string | null;
          created_at: string;
          id: string;
          lawyer_id: string;
          rating: number;
        };
        Insert: {
          author_id: string;
          author_name?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          lawyer_id: string;
          rating: number;
        };
        Update: {
          author_id?: string;
          author_name?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          lawyer_id?: string;
          rating?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_lawyer_id_fkey";
            columns: ["lawyer_id"];
            isOneToOne: false;
            referencedRelation: "lawyers";
            referencedColumns: ["id"];
          },
        ];
      };
      security_tips: {
        Row: {
          body: string;
          created_at: string;
          icon: string | null;
          id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          icon?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wanted_persons: {
        Row: {
          alias: string | null;
          created_at: string;
          danger_level: string;
          description: string | null;
          id: string;
          last_seen: string | null;
          name: string;
          offence: string | null;
          photo_url: string | null;
          posted_by: string | null;
          reward: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          alias?: string | null;
          created_at?: string;
          danger_level?: string;
          description?: string | null;
          id?: string;
          last_seen?: string | null;
          name: string;
          offence?: string | null;
          photo_url?: string | null;
          posted_by?: string | null;
          reward?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          alias?: string | null;
          created_at?: string;
          danger_level?: string;
          description?: string | null;
          id?: string;
          last_seen?: string | null;
          name?: string;
          offence?: string | null;
          photo_url?: string | null;
          posted_by?: string | null;
          reward?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "user" | "lawyer" | "police" | "judiciary" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "lawyer", "police", "judiciary", "admin"],
    },
  },
} as const;
