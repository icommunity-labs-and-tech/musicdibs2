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
      ab_test_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          session_id: string | null
          test_id: string
          variant_index: number
          variant_text: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          session_id?: string | null
          test_id: string
          variant_index: number
          variant_text: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          session_id?: string | null
          test_id?: string
          variant_index?: number
          variant_text?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          audio_url: string
          created_at: string
          duration: number
          genre: string | null
          id: string
          is_favorite: boolean | null
          mood: string | null
          prompt: string
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration: number
          genre?: string | null
          id?: string
          is_favorite?: boolean | null
          mood?: string | null
          prompt: string
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration?: number
          genre?: string | null
          id?: string
          is_favorite?: boolean | null
          mood?: string | null
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          called_at: string
          function_name: string
          id: string
          user_id: string
        }
        Insert: {
          called_at?: string
          function_name: string
          id?: string
          user_id: string
        }
        Update: {
          called_at?: string
          function_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      auphonic_productions: {
        Row: {
          auphonic_uuid: string
          created_at: string
          credits_used: number | null
          duration_secs: number | null
          error_detail: string | null
          id: string
          input_url: string | null
          mode: string
          output_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auphonic_uuid: string
          created_at?: string
          credits_used?: number | null
          duration_secs?: number | null
          error_detail?: string | null
          id?: string
          input_url?: string | null
          mode: string
          output_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auphonic_uuid?: string
          created_at?: string
          credits_used?: number | null
          duration_secs?: number | null
          error_detail?: string | null
          id?: string
          input_url?: string | null
          mode?: string
          output_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          language: string
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          language?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          language?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      ibs_signatures: {
        Row: {
          created_at: string
          ibs_signature_id: string
          id: string
          kyc_url: string | null
          signature_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ibs_signature_id: string
          id?: string
          kyc_url?: string | null
          signature_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ibs_signature_id?: string
          id?: string
          kyc_url?: string | null
          signature_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ibs_sync_queue: {
        Row: {
          created_at: string
          error_detail: string | null
          ibs_evidence_id: string
          id: string
          last_retry_at: string | null
          max_retries: number
          retry_count: number
          status: string
          updated_at: string
          user_id: string
          work_id: string
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          ibs_evidence_id: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number
          retry_count?: number
          status?: string
          updated_at?: string
          user_id: string
          work_id: string
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          ibs_evidence_id?: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ibs_sync_queue_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      lyrics_generations: {
        Row: {
          artist_refs: string[] | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          language: string | null
          lyrics: string
          mood: string | null
          pov: string | null
          rhyme_scheme: string | null
          structure: string | null
          style: string | null
          theme: string | null
          user_id: string
        }
        Insert: {
          artist_refs?: string[] | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          language?: string | null
          lyrics: string
          mood?: string | null
          pov?: string | null
          rhyme_scheme?: string | null
          structure?: string | null
          style?: string | null
          theme?: string | null
          user_id: string
        }
        Update: {
          artist_refs?: string[] | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          language?: string | null
          lyrics?: string
          mood?: string | null
          pov?: string | null
          rhyme_scheme?: string | null
          structure?: string | null
          style?: string | null
          theme?: string | null
          user_id?: string
        }
        Relationships: []
      }
      managed_artists: {
        Row: {
          artist_country: string | null
          artist_email: string | null
          artist_name: string
          artist_phone: string | null
          artist_user_id: string | null
          contract_reference: string | null
          contract_signed_at: string | null
          created_at: string
          id: string
          manager_user_id: string
          notes: string | null
          representation_type: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_country?: string | null
          artist_email?: string | null
          artist_name: string
          artist_phone?: string | null
          artist_user_id?: string | null
          contract_reference?: string | null
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          manager_user_id: string
          notes?: string | null
          representation_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_country?: string | null
          artist_email?: string | null
          artist_name?: string
          artist_phone?: string | null
          artist_user_id?: string | null
          contract_reference?: string | null
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          manager_user_id?: string
          notes?: string | null
          representation_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      managed_works: {
        Row: {
          authorized_by: string
          created_at: string
          id: string
          managed_artist_id: string
          manager_user_id: string
          work_id: string
        }
        Insert: {
          authorized_by?: string
          created_at?: string
          id?: string
          managed_artist_id: string
          manager_user_id: string
          work_id: string
        }
        Update: {
          authorized_by?: string
          created_at?: string
          id?: string
          managed_artist_id?: string
          manager_user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "managed_works_managed_artist_id_fkey"
            columns: ["managed_artist_id"]
            isOneToOne: false
            referencedRelation: "managed_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managed_works_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_contact_requests: {
        Row: {
          company_name: string | null
          country: string | null
          created_at: string
          email: string
          estimated_artists: string
          estimated_works: string | null
          full_name: string
          id: string
          message: string | null
          needs_ai_studio: boolean | null
          needs_distribution: boolean | null
          phone: string | null
          status: string
        }
        Insert: {
          company_name?: string | null
          country?: string | null
          created_at?: string
          email: string
          estimated_artists: string
          estimated_works?: string | null
          full_name: string
          id?: string
          message?: string | null
          needs_ai_studio?: boolean | null
          needs_distribution?: boolean | null
          phone?: string | null
          status?: string
        }
        Update: {
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string
          estimated_artists?: string
          estimated_works?: string | null
          full_name?: string
          id?: string
          message?: string | null
          needs_ai_studio?: boolean | null
          needs_distribution?: boolean | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      manager_contracts: {
        Row: {
          created_at: string
          id: string
          manager_user_id: string
          max_artists: number | null
          plan_name: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          manager_user_id: string
          max_artists?: number | null
          plan_name?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          manager_user_id?: string
          max_artists?: number | null
          plan_name?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          available_credits: number
          created_at: string
          display_name: string | null
          ibs_signature_id: string | null
          id: string
          is_blocked: boolean | null
          kyc_status: string
          phone: string | null
          stripe_customer_id: string | null
          subscription_plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_credits?: number
          created_at?: string
          display_name?: string | null
          ibs_signature_id?: string | null
          id?: string
          is_blocked?: boolean | null
          kyc_status?: string
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_credits?: number
          created_at?: string
          display_name?: string | null
          ibs_signature_id?: string | null
          id?: string
          is_blocked?: boolean | null
          kyc_status?: string
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotion_requests: {
        Row: {
          artist_name: string
          created_at: string
          description: string
          id: string
          main_link: string
          promotion_goal: string
          social_networks: string | null
          status: string
          user_id: string
          work_title: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          description: string
          id?: string
          main_link: string
          promotion_goal: string
          social_networks?: string | null
          status?: string
          user_id: string
          work_title: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          description?: string
          id?: string
          main_link?: string
          promotion_goal?: string
          social_networks?: string | null
          status?: string
          user_id?: string
          work_title?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      video_generations: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          duration: number | null
          failure_reason: string | null
          id: string
          merged_audio_id: string | null
          merged_url: string | null
          mode: string
          prompt: string
          status: string
          style: string | null
          task_id: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          duration?: number | null
          failure_reason?: string | null
          id?: string
          merged_audio_id?: string | null
          merged_url?: string | null
          mode?: string
          prompt: string
          status?: string
          style?: string | null
          task_id: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          duration?: number | null
          failure_reason?: string | null
          id?: string
          merged_audio_id?: string | null
          merged_url?: string | null
          mode?: string
          prompt?: string
          status?: string
          style?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          emoji: string | null
          gender: string
          id: string
          label: string
          prompt_tag: string
          sample_generated_at: string | null
          sample_url: string | null
          sort_order: number | null
          style: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          gender: string
          id: string
          label: string
          prompt_tag: string
          sample_generated_at?: string | null
          sample_url?: string | null
          sort_order?: number | null
          style: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          gender?: string
          id?: string
          label?: string
          prompt_tag?: string
          sample_generated_at?: string | null
          sample_url?: string | null
          sort_order?: number | null
          style?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          author: string | null
          blockchain_hash: string | null
          blockchain_network: string | null
          certificate_url: string | null
          certified_at: string | null
          checker_url: string | null
          created_at: string
          description: string | null
          distributed_at: string | null
          distribution_clicks: number | null
          file_hash: string | null
          file_path: string | null
          ibs_evidence_id: string | null
          ibs_payload_algorithm: string | null
          ibs_payload_checksum: string | null
          ibs_signature_id: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          blockchain_hash?: string | null
          blockchain_network?: string | null
          certificate_url?: string | null
          certified_at?: string | null
          checker_url?: string | null
          created_at?: string
          description?: string | null
          distributed_at?: string | null
          distribution_clicks?: number | null
          file_hash?: string | null
          file_path?: string | null
          ibs_evidence_id?: string | null
          ibs_payload_algorithm?: string | null
          ibs_payload_checksum?: string | null
          ibs_signature_id?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          blockchain_hash?: string | null
          blockchain_network?: string | null
          certificate_url?: string | null
          certified_at?: string | null
          checker_url?: string | null
          created_at?: string
          description?: string | null
          distributed_at?: string | null
          distribution_clicks?: number | null
          file_hash?: string | null
          file_path?: string | null
          ibs_evidence_id?: string | null
          ibs_payload_algorithm?: string | null
          ibs_payload_checksum?: string | null
          ibs_signature_id?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "manager"
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
      app_role: ["admin", "moderator", "user", "manager"],
    },
  },
} as const
