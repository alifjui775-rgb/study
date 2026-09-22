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
      admission_units: {
        Row: {
          allowed_group_ids: string[] | null
          calculator_allowed: boolean | null
          calculator_link: string | null
          cluster_id: string | null
          college_id: string | null
          deleted_at: string | null
          exam_center_link: string | null
          exam_center_note: string | null
          id: string
          primary_group_id: string | null
          sort_order: number
          unit_name_bn: string
          unit_name_en: string | null
          unit_slug: string
          university_id: string | null
        }
        Insert: {
          allowed_group_ids?: string[] | null
          calculator_allowed?: boolean | null
          calculator_link?: string | null
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          exam_center_link?: string | null
          exam_center_note?: string | null
          id?: string
          primary_group_id?: string | null
          sort_order?: number
          unit_name_bn: string
          unit_name_en?: string | null
          unit_slug: string
          university_id?: string | null
        }
        Update: {
          allowed_group_ids?: string[] | null
          calculator_allowed?: boolean | null
          calculator_link?: string | null
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          exam_center_link?: string | null
          exam_center_note?: string | null
          id?: string
          primary_group_id?: string | null
          sort_order?: number
          unit_name_bn?: string
          unit_name_en?: string | null
          unit_slug?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_units_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_units_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_units_primary_group_id_fkey"
            columns: ["primary_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_units_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      admit_card_details: {
        Row: {
          admit_card_url: string | null
          batch_id: string
          cluster_id: string | null
          college_id: string | null
          download_end_datetime: string | null
          download_start_datetime: string | null
          id: string
          note: string | null
          university_id: string | null
        }
        Insert: {
          admit_card_url?: string | null
          batch_id: string
          cluster_id?: string | null
          college_id?: string | null
          download_end_datetime?: string | null
          download_start_datetime?: string | null
          id?: string
          note?: string | null
          university_id?: string | null
        }
        Update: {
          admit_card_url?: string | null
          batch_id?: string
          cluster_id?: string | null
          college_id?: string | null
          download_end_datetime?: string | null
          download_start_datetime?: string | null
          id?: string
          note?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admit_card_details_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_details_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_details_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_details_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_details_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      admit_card_units: {
        Row: {
          admit_card_id: string
          id: string
          unit_id: string
        }
        Insert: {
          admit_card_id: string
          id?: string
          unit_id: string
        }
        Update: {
          admit_card_id?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admit_card_units_admit_card_id_fkey"
            columns: ["admit_card_id"]
            isOneToOne: false
            referencedRelation: "admit_card_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admit_card_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      application_details: {
        Row: {
          apply_url: string | null
          batch_id: string
          cluster_id: string | null
          college_id: string | null
          end_datetime: string | null
          fee: number | null
          fee_payment_method: string | null
          helpful_links: Json | null
          id: string
          note: string | null
          start_datetime: string | null
          university_id: string | null
        }
        Insert: {
          apply_url?: string | null
          batch_id: string
          cluster_id?: string | null
          college_id?: string | null
          end_datetime?: string | null
          fee?: number | null
          fee_payment_method?: string | null
          helpful_links?: Json | null
          id?: string
          note?: string | null
          start_datetime?: string | null
          university_id?: string | null
        }
        Update: {
          apply_url?: string | null
          batch_id?: string
          cluster_id?: string | null
          college_id?: string | null
          end_datetime?: string | null
          fee?: number | null
          fee_payment_method?: string | null
          helpful_links?: Json | null
          id?: string
          note?: string | null
          start_datetime?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_details_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_details_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_details_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_details_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_details_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      application_phases: {
        Row: {
          application_id: string
          apply_url: string | null
          deleted_at: string | null
          end_datetime: string
          fee: number | null
          fee_payment_method: string | null
          id: string
          phase_links: Json | null
          phase_name: string
          sort_order: number
          start_datetime: string
        }
        Insert: {
          application_id: string
          apply_url?: string | null
          deleted_at?: string | null
          end_datetime: string
          fee?: number | null
          fee_payment_method?: string | null
          id?: string
          phase_links?: Json | null
          phase_name: string
          sort_order?: number
          start_datetime: string
        }
        Update: {
          application_id?: string
          apply_url?: string | null
          deleted_at?: string | null
          end_datetime?: string
          fee?: number | null
          fee_payment_method?: string | null
          id?: string
          phase_links?: Json | null
          phase_name?: string
          sort_order?: number
          start_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_phases_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_details"
            referencedColumns: ["id"]
          },
        ]
      }
      application_units: {
        Row: {
          application_id: string
          id: string
          unit_id: string
        }
        Insert: {
          application_id: string
          id?: string
          unit_id: string
        }
        Update: {
          application_id?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_units_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "application_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          id: string
          student_id: string
          submission_link: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          id?: string
          student_id: string
          submission_link: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          id?: string
          student_id?: string
          submission_link?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          date: string | null
          deleted_at: string | null
          due_date: string | null
          id: string
          instructions: Json | null
          section_id: string
          sequence_order: number | null
          subsection_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          date?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          instructions?: Json | null
          section_id: string
          sequence_order?: number | null
          subsection_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          date?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          instructions?: Json | null
          section_id?: string
          sequence_order?: number | null
          subsection_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_study_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          deleted_at: string | null
          id: string
          is_current: boolean
          name: string
          year: number
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          is_current?: boolean
          name: string
          year: number
        }
        Update: {
          deleted_at?: string | null
          id?: string
          is_current?: boolean
          name?: string
          year?: number
        }
        Relationships: []
      }
      calendar_snapshot_debounce: {
        Row: {
          id: number
          last_fire: string
        }
        Insert: {
          id?: number
          last_fire?: string
        }
        Update: {
          id?: number
          last_fire?: string
        }
        Relationships: []
      }
      chapter_topics: {
        Row: {
          chapter_id: string
          id: string
          name: string
          paper_id: string
          serial: number | null
        }
        Insert: {
          chapter_id: string
          id?: string
          name: string
          paper_id: string
          serial?: number | null
        }
        Update: {
          chapter_id?: string
          id?: string
          name?: string
          paper_id?: string
          serial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hsc_topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "paper_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsc_topics_subject_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      circular_units: {
        Row: {
          circular_id: string
          id: string
          unit_id: string
        }
        Insert: {
          circular_id: string
          id?: string
          unit_id: string
        }
        Update: {
          circular_id?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circular_units_circular_id_fkey"
            columns: ["circular_id"]
            isOneToOne: false
            referencedRelation: "circulars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circular_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      circulars: {
        Row: {
          batch_id: string
          cluster_id: string | null
          college_id: string | null
          deleted_at: string | null
          download_url: string | null
          id: string
          note: string | null
          title: string
          university_id: string | null
        }
        Insert: {
          batch_id: string
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          download_url?: string | null
          id?: string
          note?: string | null
          title: string
          university_id?: string | null
        }
        Update: {
          batch_id?: string
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          download_url?: string | null
          id?: string
          note?: string | null
          title?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circulars_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circulars_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          course_id: string
          date: string | null
          deleted_at: string | null
          id: string
          is_live: boolean | null
          notes: string | null
          section_id: string
          sequence_order: number | null
          subsection_id: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          is_live?: boolean | null
          notes?: string | null
          section_id: string
          sequence_order?: number | null
          subsection_id?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          is_live?: boolean | null
          notes?: string | null
          section_id?: string
          sequence_order?: number | null
          subsection_id?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_colleges: {
        Row: {
          cluster_id: string
          college_id: string
          id: string
        }
        Insert: {
          cluster_id: string
          college_id: string
          id?: string
        }
        Update: {
          cluster_id?: string
          college_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_colleges_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_colleges_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_universities: {
        Row: {
          cluster_id: string
          id: string
          unit_id: string | null
          university_id: string
        }
        Insert: {
          cluster_id: string
          id?: string
          unit_id?: string | null
          university_id: string
        }
        Update: {
          cluster_id?: string
          id?: string
          unit_id?: string | null
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_universities_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_universities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_universities_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          admission_url: string | null
          calculator_allowed: boolean
          calculator_link: string | null
          cluster_type: string
          deleted_at: string | null
          description: string | null
          history: string | null
          history_source: Json | null
          id: string
          logo_url: string | null
          name_bn: string
          name_en: string
          negative_mark: number | null
          parent_university_id: string | null
          second_time: boolean
          second_time_condition: string | null
          short_name_bn: string
          short_name_en: string
          slug: string
          website_url: string | null
        }
        Insert: {
          admission_url?: string | null
          calculator_allowed?: boolean
          calculator_link?: string | null
          cluster_type: string
          deleted_at?: string | null
          description?: string | null
          history?: string | null
          history_source?: Json | null
          id?: string
          logo_url?: string | null
          name_bn: string
          name_en: string
          negative_mark?: number | null
          parent_university_id?: string | null
          second_time?: boolean
          second_time_condition?: string | null
          short_name_bn: string
          short_name_en: string
          slug: string
          website_url?: string | null
        }
        Update: {
          admission_url?: string | null
          calculator_allowed?: boolean
          calculator_link?: string | null
          cluster_type?: string
          deleted_at?: string | null
          description?: string | null
          history?: string | null
          history_source?: Json | null
          id?: string
          logo_url?: string | null
          name_bn?: string
          name_en?: string
          negative_mark?: number | null
          parent_university_id?: string | null
          second_time?: boolean
          second_time_condition?: string | null
          short_name_bn?: string
          short_name_en?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clusters_parent_university_id_fkey"
            columns: ["parent_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          admission_url: string | null
          calculator_allowed: boolean
          calculator_link: string | null
          category: string
          deleted_at: string | null
          description: string | null
          eiin: number | null
          history: string | null
          history_source: Json | null
          id: string
          logo_url: string | null
          name_bn: string
          name_en: string
          negative_mark: number | null
          second_time: boolean
          second_time_condition: string | null
          short_name_bn: string
          short_name_en: string
          slug: string
          sub_category: string[] | null
          type: string[] | null
          website_url: string | null
        }
        Insert: {
          admission_url?: string | null
          calculator_allowed?: boolean
          calculator_link?: string | null
          category: string
          deleted_at?: string | null
          description?: string | null
          eiin?: number | null
          history?: string | null
          history_source?: Json | null
          id?: string
          logo_url?: string | null
          name_bn: string
          name_en: string
          negative_mark?: number | null
          second_time?: boolean
          second_time_condition?: string | null
          short_name_bn: string
          short_name_en: string
          slug: string
          sub_category?: string[] | null
          type?: string[] | null
          website_url?: string | null
        }
        Update: {
          admission_url?: string | null
          calculator_allowed?: boolean
          calculator_link?: string | null
          category?: string
          deleted_at?: string | null
          description?: string | null
          eiin?: number | null
          history?: string | null
          history_source?: Json | null
          id?: string
          logo_url?: string | null
          name_bn?: string
          name_en?: string
          negative_mark?: number | null
          second_time?: boolean
          second_time_condition?: string | null
          short_name_bn?: string
          short_name_en?: string
          slug?: string
          sub_category?: string[] | null
          type?: string[] | null
          website_url?: string | null
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_files: {
        Row: {
          course_id: string
          date: string | null
          deleted_at: string | null
          description: string | null
          file_url: string
          id: string
          is_public: boolean
          section_id: string
          sequence_order: number | null
          subsection_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          date?: string | null
          deleted_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          is_public?: boolean
          section_id: string
          sequence_order?: number | null
          subsection_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          date?: string | null
          deleted_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          is_public?: boolean
          section_id?: string
          sequence_order?: number | null
          subsection_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_files_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_files_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          course_id: string
          created_at: string
          helper_permissions: Json
          id: string
          role_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          helper_permissions?: Json
          id?: string
          role_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          helper_permissions?: Json
          id?: string
          role_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          admin_id: string
          attendance: boolean | null
          batch_ids: string[] | null
          battle: boolean | null
          category_ids: string[] | null
          cover_url: string | null
          created_at: string | null
          custom_exam: boolean | null
          deleted_at: string | null
          details: string | null
          discount_ends_at: string | null
          discount_max_limit: number | null
          end_date: string | null
          faq: Json | null
          features: string[] | null
          group_link: string | null
          group_study: boolean | null
          id: string
          price_discounted: number | null
          price_regular: number
          routine_url: string | null
          short_description: string | null
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["course_status"] | null
          task: boolean | null
          title: string
          validity_days: number | null
          youtube_url: string | null
        }
        Insert: {
          admin_id: string
          attendance?: boolean | null
          batch_ids?: string[] | null
          battle?: boolean | null
          category_ids?: string[] | null
          cover_url?: string | null
          created_at?: string | null
          custom_exam?: boolean | null
          deleted_at?: string | null
          details?: string | null
          discount_ends_at?: string | null
          discount_max_limit?: number | null
          end_date?: string | null
          faq?: Json | null
          features?: string[] | null
          group_link?: string | null
          group_study?: boolean | null
          id?: string
          price_discounted?: number | null
          price_regular?: number
          routine_url?: string | null
          short_description?: string | null
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          task?: boolean | null
          title: string
          validity_days?: number | null
          youtube_url?: string | null
        }
        Update: {
          admin_id?: string
          attendance?: boolean | null
          batch_ids?: string[] | null
          battle?: boolean | null
          category_ids?: string[] | null
          cover_url?: string | null
          created_at?: string | null
          custom_exam?: boolean | null
          deleted_at?: string | null
          details?: string | null
          discount_ends_at?: string | null
          discount_max_limit?: number | null
          end_date?: string | null
          faq?: Json | null
          features?: string[] | null
          group_link?: string | null
          group_study?: boolean | null
          id?: string
          price_discounted?: number | null
          price_regular?: number
          routine_url?: string | null
          short_description?: string | null
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          task?: boolean | null
          title?: string
          validity_days?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      curriculum_papers: {
        Row: {
          discipline_id: string | null
          id: string
          name_bn: string | null
          name_en: string
          short_code: string | null
        }
        Insert: {
          discipline_id?: string | null
          id?: string
          name_bn?: string | null
          name_en: string
          short_code?: string | null
        }
        Update: {
          discipline_id?: string | null
          id?: string
          name_bn?: string | null
          name_en?: string
          short_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_papers_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "study_disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      degree_programs: {
        Row: {
          deleted_at: string | null
          description: string | null
          faculty_id: number | null
          full_name_bn: string | null
          full_name_en: string
          id: string
          lucide_icon_name: string | null
          review: string | null
          review_sources: Json | null
          short_name: string | null
          slug: string
        }
        Insert: {
          deleted_at?: string | null
          description?: string | null
          faculty_id?: number | null
          full_name_bn?: string | null
          full_name_en: string
          id?: string
          lucide_icon_name?: string | null
          review?: string | null
          review_sources?: Json | null
          short_name?: string | null
          slug: string
        }
        Update: {
          deleted_at?: string | null
          description?: string | null
          faculty_id?: number | null
          full_name_bn?: string | null
          full_name_en?: string
          id?: string
          lucide_icon_name?: string | null
          review?: string | null
          review_sources?: Json | null
          short_name?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "degree_programs_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_notes: {
        Row: {
          cluster_id: string | null
          college_id: string | null
          content: string
          created_at: string | null
          deleted_at: string | null
          display_section: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          unit_id: string | null
          university_id: string | null
        }
        Insert: {
          cluster_id?: string | null
          college_id?: string | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          display_section: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          unit_id?: string | null
          university_id?: string | null
        }
        Update: {
          cluster_id?: string | null
          college_id?: string | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          display_section?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          unit_id?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_notes_uni_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_notes_unit_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          deleted_at: string | null
          enrolled_at: string | null
          id: string
          status: boolean | null
          student_id: string
        }
        Insert: {
          course_id: string
          deleted_at?: string | null
          enrolled_at?: string | null
          id?: string
          status?: boolean | null
          student_id: string
        }
        Update: {
          course_id?: string
          deleted_at?: string | null
          enrolled_at?: string | null
          id?: string
          status?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          cq_id: string | null
          created_at: string
          exam_id: string
          id: string
          mcq_id: string | null
          sequence_order: number
          written_id: string | null
        }
        Insert: {
          cq_id?: string | null
          created_at?: string
          exam_id: string
          id?: string
          mcq_id?: string | null
          sequence_order?: number
          written_id?: string | null
        }
        Update: {
          cq_id?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          mcq_id?: string | null
          sequence_order?: number
          written_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_cq_id_fkey"
            columns: ["cq_id"]
            isOneToOne: false
            referencedRelation: "questions_cq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "questions_mcq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_written_id_fkey"
            columns: ["written_id"]
            isOneToOne: false
            referencedRelation: "questions_written"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_schedules: {
        Row: {
          batch_id: string
          cluster_id: string | null
          college_id: string | null
          deleted_at: string | null
          exam_datetime: string
          id: string
          is_tentative: boolean
          note: string | null
          unit_id: string
        }
        Insert: {
          batch_id: string
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          exam_datetime: string
          id?: string
          is_tentative?: boolean
          note?: string | null
          unit_id: string
        }
        Update: {
          batch_id?: string
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          exam_datetime?: string
          id?: string
          is_tentative?: boolean
          note?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_schedules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedules_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedules_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string | null
          created_at: string
          deleted_at: string | null
          duration_minutes: number | null
          end_at: string | null
          exam_type: string
          file_id: string | null
          id: string
          is_practice: boolean | null
          mandatory_subjects: string[] | null
          marks_per_question: number
          name: string
          negative_marks_per_wrong: number
          optional_subjects: string[] | null
          section_id: string | null
          sequence_order: number | null
          shuffle_questions: boolean | null
          shuffle_sections_only: boolean | null
          start_at: string | null
          subsection_id: string | null
          total_subjects: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          end_at?: string | null
          exam_type?: string
          file_id?: string | null
          id?: string
          is_practice?: boolean | null
          mandatory_subjects?: string[] | null
          marks_per_question?: number
          name: string
          negative_marks_per_wrong?: number
          optional_subjects?: string[] | null
          section_id?: string | null
          sequence_order?: number | null
          shuffle_questions?: boolean | null
          shuffle_sections_only?: boolean | null
          start_at?: string | null
          subsection_id?: string | null
          total_subjects?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          end_at?: string | null
          exam_type?: string
          file_id?: string | null
          id?: string
          is_practice?: boolean | null
          mandatory_subjects?: string[] | null
          marks_per_question?: number
          name?: string
          negative_marks_per_wrong?: number
          optional_subjects?: string[] | null
          section_id?: string | null
          sequence_order?: number | null
          shuffle_questions?: boolean | null
          shuffle_sections_only?: boolean | null
          start_at?: string | null
          subsection_id?: string | null
          total_subjects?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          deleted_at: string | null
          id: number
          name_bn: string
          name_en: string
        }
        Insert: {
          deleted_at?: string | null
          id?: number
          name_bn: string
          name_en: string
        }
        Update: {
          deleted_at?: string | null
          id?: number
          name_bn?: string
          name_en?: string
        }
        Relationships: []
      }
      gpa_calculation_methods: {
        Row: {
          cluster_id: string | null
          college_id: string | null
          hsc_max_marks: number | null
          hsc_weight: number | null
          id: string
          max_gpa: number | null
          method: string
          notes: string | null
          ssc_max_marks: number | null
          ssc_weight: number | null
          total_score: number
          university_id: string | null
        }
        Insert: {
          cluster_id?: string | null
          college_id?: string | null
          hsc_max_marks?: number | null
          hsc_weight?: number | null
          id?: string
          max_gpa?: number | null
          method: string
          notes?: string | null
          ssc_max_marks?: number | null
          ssc_weight?: number | null
          total_score: number
          university_id?: string | null
        }
        Update: {
          cluster_id?: string | null
          college_id?: string | null
          hsc_max_marks?: number | null
          hsc_weight?: number | null
          id?: string
          max_gpa?: number | null
          method?: string
          notes?: string | null
          ssc_max_marks?: number | null
          ssc_weight?: number | null
          total_score?: number
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gpa_calculation_methods_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gpa_calculation_methods_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gpa_calculation_methods_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          name_bn: string
          name_en: string
        }
        Insert: {
          id?: string
          name_bn: string
          name_en: string
        }
        Update: {
          id?: string
          name_bn?: string
          name_en?: string
        }
        Relationships: []
      }
      id_role: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      institution_general_info: {
        Row: {
          cluster_id: string | null
          college_id: string | null
          id: string
          label: string
          sort_order: number
          unit_id: string | null
          university_id: string | null
          value: string
        }
        Insert: {
          cluster_id?: string | null
          college_id?: string | null
          id?: string
          label: string
          sort_order?: number
          unit_id?: string | null
          university_id?: string | null
          value: string
        }
        Update: {
          cluster_id?: string | null
          college_id?: string | null
          id?: string
          label?: string
          sort_order?: number
          unit_id?: string | null
          university_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_general_info_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_general_info_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_general_info_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_general_info_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_links: {
        Row: {
          cluster_id: string | null
          col_span: number
          college_id: string | null
          id: string
          is_external: boolean
          label: string
          row_group: number
          sort_order: number
          university_id: string | null
          url: string
        }
        Insert: {
          cluster_id?: string | null
          col_span?: number
          college_id?: string | null
          id?: string
          is_external?: boolean
          label: string
          row_group?: number
          sort_order?: number
          university_id?: string | null
          url: string
        }
        Update: {
          cluster_id?: string | null
          col_span?: number
          college_id?: string | null
          id?: string
          is_external?: boolean
          label?: string
          row_group?: number
          sort_order?: number
          university_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_links_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_links_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_links_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_sub_categories: {
        Row: {
          created_at: string
          id: string
          name_bn: string
          name_en: string
          short_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_bn: string
          name_en: string
          short_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name_bn?: string
          name_en?: string
          short_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      institution_subjects: {
        Row: {
          cluster_id: string | null
          college_id: string | null
          custom_review_url: string | null
          degree_program_id: string
          id: string
          unit_id: string | null
          university_id: string | null
        }
        Insert: {
          cluster_id?: string | null
          college_id?: string | null
          custom_review_url?: string | null
          degree_program_id: string
          id?: string
          unit_id?: string | null
          university_id?: string | null
        }
        Update: {
          cluster_id?: string | null
          college_id?: string | null
          custom_review_url?: string | null
          degree_program_id?: string
          id?: string
          unit_id?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_subjects_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_subjects_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_subjects_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_subjects_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_subjects_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      instructions: {
        Row: {
          course_id: string
          date: string | null
          deleted_at: string | null
          details: string
          id: string
          is_public: boolean
          section_id: string
          sequence_order: number | null
          subsection_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          date?: string | null
          deleted_at?: string | null
          details: string
          id?: string
          is_public?: boolean
          section_id: string
          sequence_order?: number | null
          subsection_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          date?: string | null
          deleted_at?: string | null
          details?: string
          id?: string
          is_public?: boolean
          section_id?: string
          sequence_order?: number | null
          subsection_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructions_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      map_locations: {
        Row: {
          category: string
          cluster_id: string | null
          college_id: string | null
          deleted_at: string | null
          google_maps_url: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          sort_order: number
          tooltip: string | null
          university_id: string | null
        }
        Insert: {
          category: string
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          google_maps_url: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          sort_order?: number
          tooltip?: string | null
          university_id?: string | null
        }
        Update: {
          category?: string
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          google_maps_url?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          sort_order?: number
          tooltip?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_locations_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_locations_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_locations_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          app_logo: string | null
          app_name: string
          client_id: string
          client_secret: string
          created_at: string | null
          is_approved: boolean | null
          owner_id: string | null
          redirect_uris: string[]
        }
        Insert: {
          app_logo?: string | null
          app_name: string
          client_id?: string
          client_secret: string
          created_at?: string | null
          is_approved?: boolean | null
          owner_id?: string | null
          redirect_uris: string[]
        }
        Update: {
          app_logo?: string | null
          app_name?: string
          client_id?: string
          client_secret?: string
          created_at?: string | null
          is_approved?: boolean | null
          owner_id?: string | null
          redirect_uris?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "oauth_clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "oauth_clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["uid"]
          },
        ]
      }
      oauth_codes: {
        Row: {
          client_id: string | null
          code: string
          created_at: string | null
          expires_at: string
          redirect_uri: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          code: string
          created_at?: string | null
          expires_at: string
          redirect_uri: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          code?: string
          created_at?: string | null
          expires_at?: string
          redirect_uri?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "oauth_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["uid"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          deleted_at: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone_number: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone_number: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_chapters: {
        Row: {
          id: string
          name: string
          paper_id: string
          serial: number | null
          short_code: string | null
        }
        Insert: {
          id?: string
          name: string
          paper_id: string
          serial?: number | null
          short_code?: string | null
        }
        Update: {
          id?: string
          name?: string
          paper_id?: string
          serial?: number | null
          short_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hsc_chapters_subject_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_groups: {
        Row: {
          group_id: string
          id: string
          paper_id: string
        }
        Insert: {
          group_id: string
          id?: string
          paper_id: string
        }
        Update: {
          group_id?: string
          id?: string
          paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hsc_subject_groups_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hsc_subject_groups_hsc_subject_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      passkeys: {
        Row: {
          backed_up: boolean | null
          counter: number
          created_at: string | null
          credential_id: string
          device_type: string | null
          id: string
          public_key: string
          user_id: string
        }
        Insert: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string | null
          credential_id: string
          device_type?: string | null
          id?: string
          public_key: string
          user_id: string
        }
        Update: {
          backed_up?: boolean | null
          counter?: number
          created_at?: string | null
          credential_id?: string
          device_type?: string | null
          id?: string
          public_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passkeys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "passkeys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["uid"]
          },
        ]
      }
      polls: {
        Row: {
          course_id: string
          date: string | null
          deleted_at: string | null
          id: string
          poll_system_id: string
          section_id: string
          sequence_order: number | null
          subsection_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          poll_system_id: string
          section_id: string
          sequence_order?: number | null
          subsection_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          date?: string | null
          deleted_at?: string | null
          id?: string
          poll_system_id?: string
          section_id?: string
          sequence_order?: number | null
          subsection_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_exam_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          negative_marks: number | null
          practice_exam_id: string | null
          question_ids: string[]
          student_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          negative_marks?: number | null
          practice_exam_id?: string | null
          question_ids?: string[]
          student_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          negative_marks?: number | null
          practice_exam_id?: string | null
          question_ids?: string[]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_exam_sessions_practice_exam_id_fkey"
            columns: ["practice_exam_id"]
            isOneToOne: false
            referencedRelation: "student_practice_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_exam_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_file_access: {
        Row: {
          assigned_by: string | null
          created_at: string
          file_id: string
          id: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          file_id: string
          id?: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          file_id?: string
          id?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qb_file_access_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_file_access_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "qb_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_file_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_files: {
        Row: {
          category_id: string | null
          cluster_id: string | null
          college_id: string | null
          deleted_at: string | null
          display_name: string | null
          external_id: string | null
          id: string
          original_filename: string
          set_id: string | null
          total_questions: number | null
          unit_id: string | null
          university_id: string | null
          uploaded_at: string | null
          user_id: string | null
          year_id: string | null
        }
        Insert: {
          category_id?: string | null
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          display_name?: string | null
          external_id?: string | null
          id?: string
          original_filename: string
          set_id?: string | null
          total_questions?: number | null
          unit_id?: string | null
          university_id?: string | null
          uploaded_at?: string | null
          user_id?: string | null
          year_id?: string | null
        }
        Update: {
          category_id?: string | null
          cluster_id?: string | null
          college_id?: string | null
          deleted_at?: string | null
          display_name?: string | null
          external_id?: string | null
          id?: string
          original_filename?: string
          set_id?: string | null
          total_questions?: number | null
          unit_id?: string | null
          university_id?: string | null
          uploaded_at?: string | null
          user_id?: string | null
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_files_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "institution_sub_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_files_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_manage: {
        Row: {
          assigned_by: string | null
          cluster_id: string | null
          college_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          paper_id: string | null
          permissions: Json
          role_id: number
          unit_id: string | null
          university_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          cluster_id?: string | null
          college_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          paper_id?: string | null
          permissions?: Json
          role_id?: number
          unit_id?: string | null
          university_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          cluster_id?: string | null
          college_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          paper_id?: string | null
          permissions?: Json
          role_id?: number
          unit_id?: string | null
          university_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qb_manage_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "qb_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_manage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_role: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      qb_verifications: {
        Row: {
          cq_id: string | null
          file_id: string | null
          id: string
          mcq_id: string | null
          user_id: string
          verified_at: string
          written_id: string | null
        }
        Insert: {
          cq_id?: string | null
          file_id?: string | null
          id?: string
          mcq_id?: string | null
          user_id: string
          verified_at?: string
          written_id?: string | null
        }
        Update: {
          cq_id?: string | null
          file_id?: string | null
          id?: string
          mcq_id?: string | null
          user_id?: string
          verified_at?: string
          written_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_verifications_cq_id_fkey"
            columns: ["cq_id"]
            isOneToOne: false
            referencedRelation: "questions_cq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_verifications_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "qb_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_verifications_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "questions_mcq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_verifications_written_id_fkey"
            columns: ["written_id"]
            isOneToOne: false
            referencedRelation: "questions_written"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          deleted_at: string | null
          id: string
          is_correct: boolean
          option_image: string[] | null
          option_order: number
          option_text: string | null
          question_id: string
        }
        Insert: {
          deleted_at?: string | null
          id?: string
          is_correct?: boolean
          option_image?: string[] | null
          option_order: number
          option_text?: string | null
          question_id: string
        }
        Update: {
          deleted_at?: string | null
          id?: string
          is_correct?: boolean
          option_image?: string[] | null
          option_order?: number
          option_text?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_mcq"
            referencedColumns: ["id"]
          },
        ]
      }
      question_rechecks: {
        Row: {
          cq_id: string | null
          created_at: string
          id: string
          mcq_id: string | null
          reason: string | null
          reported_by: string | null
          status: string
          updated_at: string | null
          written_id: string | null
        }
        Insert: {
          cq_id?: string | null
          created_at?: string
          id?: string
          mcq_id?: string | null
          reason?: string | null
          reported_by?: string | null
          status?: string
          updated_at?: string | null
          written_id?: string | null
        }
        Update: {
          cq_id?: string | null
          created_at?: string
          id?: string
          mcq_id?: string | null
          reason?: string | null
          reported_by?: string | null
          status?: string
          updated_at?: string | null
          written_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recheck_cq"
            columns: ["cq_id"]
            isOneToOne: false
            referencedRelation: "questions_cq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recheck_mcq"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "questions_mcq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_recheck_written"
            columns: ["written_id"]
            isOneToOne: false
            referencedRelation: "questions_written"
            referencedColumns: ["id"]
          },
        ]
      }
      question_types: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      questions_cq: {
        Row: {
          answer_1: string | null
          answer_2: string | null
          answer_3: string | null
          answer_4: string | null
          answer_image_1: string[] | null
          answer_image_2: string[] | null
          answer_image_3: string[] | null
          answer_image_4: string[] | null
          chapter_id: string | null
          created_at: string
          deleted_at: string | null
          file_id: string
          id: string
          paper_id: string | null
          question_1: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_image_1: string[] | null
          question_image_2: string[] | null
          question_image_3: string[] | null
          question_image_4: string[] | null
          stem: string | null
          stem_image: string[] | null
          topic_id: string | null
          type_id: number | null
          updated_at: string | null
        }
        Insert: {
          answer_1?: string | null
          answer_2?: string | null
          answer_3?: string | null
          answer_4?: string | null
          answer_image_1?: string[] | null
          answer_image_2?: string[] | null
          answer_image_3?: string[] | null
          answer_image_4?: string[] | null
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_id: string
          id?: string
          paper_id?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_image_1?: string[] | null
          question_image_2?: string[] | null
          question_image_3?: string[] | null
          question_image_4?: string[] | null
          stem?: string | null
          stem_image?: string[] | null
          topic_id?: string | null
          type_id?: number | null
          updated_at?: string | null
        }
        Update: {
          answer_1?: string | null
          answer_2?: string | null
          answer_3?: string | null
          answer_4?: string | null
          answer_image_1?: string[] | null
          answer_image_2?: string[] | null
          answer_image_3?: string[] | null
          answer_image_4?: string[] | null
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_id?: string
          id?: string
          paper_id?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_image_1?: string[] | null
          question_image_2?: string[] | null
          question_image_3?: string[] | null
          question_image_4?: string[] | null
          stem?: string | null
          stem_image?: string[] | null
          topic_id?: string | null
          type_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_cq_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "paper_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_cq_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "qb_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_cq_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_cq_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "chapter_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_cq_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "question_types"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_mcq: {
        Row: {
          chapter_id: string | null
          created_at: string
          deleted_at: string | null
          explanation: string | null
          explanation_image: string[] | null
          file_id: string
          id: string
          paper_id: string | null
          question: string | null
          question_image: string[] | null
          sequence_order: number | null
          topic_id: string | null
          type_id: number | null
          updated_at: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          explanation?: string | null
          explanation_image?: string[] | null
          file_id: string
          id?: string
          paper_id?: string | null
          question?: string | null
          question_image?: string[] | null
          sequence_order?: number | null
          topic_id?: string | null
          type_id?: number | null
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          explanation?: string | null
          explanation_image?: string[] | null
          file_id?: string
          id?: string
          paper_id?: string | null
          question?: string | null
          question_image?: string[] | null
          sequence_order?: number | null
          topic_id?: string | null
          type_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "paper_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "qb_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "chapter_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "question_types"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_report: {
        Row: {
          cq_id: string | null
          created_at: string
          id: string
          mcq_id: string | null
          reason: string | null
          report_images: string[] | null
          student_id: string
          written_id: string | null
        }
        Insert: {
          cq_id?: string | null
          created_at?: string
          id?: string
          mcq_id?: string | null
          reason?: string | null
          report_images?: string[] | null
          student_id: string
          written_id?: string | null
        }
        Update: {
          cq_id?: string | null
          created_at?: string
          id?: string
          mcq_id?: string | null
          reason?: string | null
          report_images?: string[] | null
          student_id?: string
          written_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_report_cq"
            columns: ["cq_id"]
            isOneToOne: false
            referencedRelation: "questions_cq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_mcq"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "questions_mcq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_student"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_written"
            columns: ["written_id"]
            isOneToOne: false
            referencedRelation: "questions_written"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_written: {
        Row: {
          answer: string | null
          answer_image: string[] | null
          chapter_id: string | null
          created_at: string
          deleted_at: string | null
          file_id: string
          id: string
          paper_id: string | null
          question: string | null
          question_image: string[] | null
          topic_id: string | null
          type_id: number | null
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          answer_image?: string[] | null
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_id: string
          id?: string
          paper_id?: string | null
          question?: string | null
          question_image?: string[] | null
          topic_id?: string | null
          type_id?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          answer_image?: string[] | null
          chapter_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_id?: string
          id?: string
          paper_id?: string | null
          question?: string | null
          question_image?: string[] | null
          topic_id?: string | null
          type_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_written_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "paper_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_written_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "qb_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_written_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_written_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "chapter_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_written_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "question_types"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          attempts: number | null
          block_count: number | null
          blocked_until: string | null
          identifier: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          block_count?: number | null
          blocked_until?: string | null
          identifier: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          block_count?: number | null
          blocked_until?: string | null
          identifier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      result_details: {
        Row: {
          batch_id: string
          cluster_id: string | null
          college_id: string | null
          id: string
          note: string | null
          others_links: Json | null
          result_datetime: string | null
          result_url: string | null
          university_id: string | null
        }
        Insert: {
          batch_id: string
          cluster_id?: string | null
          college_id?: string | null
          id?: string
          note?: string | null
          others_links?: Json | null
          result_datetime?: string | null
          result_url?: string | null
          university_id?: string | null
        }
        Update: {
          batch_id?: string
          cluster_id?: string | null
          college_id?: string | null
          id?: string
          note?: string | null
          others_links?: Json | null
          result_datetime?: string | null
          result_url?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_details_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_details_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_details_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_details_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_details_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      result_units: {
        Row: {
          id: string
          result_id: string
          unit_id: string
        }
        Insert: {
          id?: string
          result_id: string
          unit_id: string
        }
        Update: {
          id?: string
          result_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_units_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "result_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          deleted_at: string | null
          description: string | null
          id: string
          is_open: boolean
          sequence_order: number | null
          title: string
        }
        Insert: {
          course_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_open?: boolean
          sequence_order?: number | null
          title: string
        }
        Update: {
          course_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_open?: boolean
          sequence_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          course_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_answers: {
        Row: {
          cq_id: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          marks_obtained: number | null
          mcq_id: string | null
          practice_exam_id: string | null
          selected_options: string[] | null
          student_exam_id: string | null
          student_id: string
          written_answer_images: string[] | null
          written_answer_text: string | null
          written_id: string | null
        }
        Insert: {
          cq_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_obtained?: number | null
          mcq_id?: string | null
          practice_exam_id?: string | null
          selected_options?: string[] | null
          student_exam_id?: string | null
          student_id: string
          written_answer_images?: string[] | null
          written_answer_text?: string | null
          written_id?: string | null
        }
        Update: {
          cq_id?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marks_obtained?: number | null
          mcq_id?: string | null
          practice_exam_id?: string | null
          selected_options?: string[] | null
          student_exam_id?: string | null
          student_id?: string
          written_answer_images?: string[] | null
          written_answer_text?: string | null
          written_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_answers_cq_id_fkey"
            columns: ["cq_id"]
            isOneToOne: false
            referencedRelation: "questions_cq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "questions_mcq"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_practice_exam_id_fkey"
            columns: ["practice_exam_id"]
            isOneToOne: false
            referencedRelation: "student_practice_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_student_exam_id_fkey"
            columns: ["student_exam_id"]
            isOneToOne: false
            referencedRelation: "student_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_written_id_fkey"
            columns: ["written_id"]
            isOneToOne: false
            referencedRelation: "questions_written"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exams: {
        Row: {
          correct_answers: number | null
          exam_id: string
          id: string
          score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          unattempted: number | null
          wrong_answers: number | null
        }
        Insert: {
          correct_answers?: number | null
          exam_id: string
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          unattempted?: number | null
          wrong_answers?: number | null
        }
        Update: {
          correct_answers?: number | null
          exam_id?: string
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          unattempted?: number | null
          wrong_answers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exams_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
        ]
      }
      student_practice_exams: {
        Row: {
          correct_answers: number | null
          id: string
          name: string
          negative_mark: number | null
          score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          time_minutes: number | null
          total_questions: number
          unattempted: number | null
          wrong_answers: number | null
        }
        Insert: {
          correct_answers?: number | null
          id?: string
          name: string
          negative_mark?: number | null
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          time_minutes?: number | null
          total_questions: number
          unattempted?: number | null
          wrong_answers?: number | null
        }
        Update: {
          correct_answers?: number | null
          id?: string
          name?: string
          negative_mark?: number | null
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          time_minutes?: number | null
          total_questions?: number
          unattempted?: number | null
          wrong_answers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_practice_exams_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tasks: {
        Row: {
          course_id: string
          created_at: string
          id: string
          mandatory_url: string | null
          optional_url: string | null
          student_id: string
          task_date: string | null
          todo_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          mandatory_url?: string | null
          optional_url?: string | null
          student_id: string
          task_date?: string | null
          todo_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          mandatory_url?: string | null
          optional_url?: string | null
          student_id?: string
          task_date?: string | null
          todo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "study_student"
            referencedColumns: ["id"]
          },
        ]
      }
      study_admin: {
        Row: {
          assigned_by: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_super_admin: boolean
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          deleted_at?: string | null
          id: string
          is_super_admin?: boolean
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_admin_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_admin_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      study_disciplines: {
        Row: {
          deleted_at: string | null
          icon_url: string | null
          id: string
          level_id: number | null
          name_bn: string
          name_en: string
          short_code: string
        }
        Insert: {
          deleted_at?: string | null
          icon_url?: string | null
          id?: string
          level_id?: number | null
          name_bn: string
          name_en: string
          short_code: string
        }
        Update: {
          deleted_at?: string | null
          icon_url?: string | null
          id?: string
          level_id?: number | null
          name_bn?: string
          name_en?: string
          short_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_disciplines_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "study_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      study_levels: {
        Row: {
          code: string
          id: number
          name: string
        }
        Insert: {
          code: string
          id: number
          name: string
        }
        Update: {
          code?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      study_student: {
        Row: {
          created_at: string
          deleted_at: string | null
          group_id: string | null
          hsc_batch_id: string | null
          hsc_gpa: number | null
          hsc_gpa_without_fourth: number | null
          id: string
          roll: number
          second_timer: boolean | null
          ssc_batch: number | null
          ssc_gpa: number | null
          ssc_gpa_without_fourth: number | null
          unit_change: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          group_id?: string | null
          hsc_batch_id?: string | null
          hsc_gpa?: number | null
          hsc_gpa_without_fourth?: number | null
          id: string
          roll?: number
          second_timer?: boolean | null
          ssc_batch?: number | null
          ssc_gpa?: number | null
          ssc_gpa_without_fourth?: number | null
          unit_change?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          group_id?: string | null
          hsc_batch_id?: string | null
          hsc_gpa?: number | null
          hsc_gpa_without_fourth?: number | null
          id?: string
          roll?: number
          second_timer?: boolean | null
          ssc_batch?: number | null
          ssc_gpa?: number | null
          ssc_gpa_without_fourth?: number | null
          unit_change?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_student_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_student_hsc_batch_id_fkey"
            columns: ["hsc_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_student_hsc_batch_id_fkey"
            columns: ["hsc_batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_student_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "study_user"
            referencedColumns: ["id"]
          },
        ]
      }
      study_user: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_admin: boolean
          is_instructor: boolean
          is_moderator: boolean
          is_qb_user: boolean
          mnr_id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          is_admin?: boolean
          is_instructor?: boolean
          is_moderator?: boolean
          is_qb_user?: boolean
          mnr_id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean
          is_instructor?: boolean
          is_moderator?: boolean
          is_qb_user?: boolean
          mnr_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subject_group_seats: {
        Row: {
          group_id: string | null
          id: string
          is_assumed: boolean
          seat_count: number
          university_subject_id: string
        }
        Insert: {
          group_id?: string | null
          id?: string
          is_assumed?: boolean
          seat_count?: number
          university_subject_id: string
        }
        Update: {
          group_id?: string | null
          id?: string
          is_assumed?: boolean
          seat_count?: number
          university_subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_group_seats_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_group_seats_university_subject_id_fkey"
            columns: ["university_subject_id"]
            isOneToOne: false
            referencedRelation: "institution_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_groups: {
        Row: {
          group_id: string
          id: string
          subject_id: string
        }
        Insert: {
          group_id: string
          id?: string
          subject_id: string
        }
        Update: {
          group_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_groups_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_groups_subject_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "study_disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      subsections: {
        Row: {
          deleted_at: string | null
          description: string | null
          id: string
          is_open: boolean
          section_id: string
          sequence_order: number | null
          title: string
        }
        Insert: {
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_open?: boolean
          section_id: string
          sequence_order?: number | null
          title: string
        }
        Update: {
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_open?: boolean
          section_id?: string
          sequence_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_unit_subjects: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          is_mandatory: boolean | null
          paper_id: string
          sort_order: number | null
          unit_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          is_mandatory?: boolean | null
          paper_id: string
          sort_order?: number | null
          unit_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          is_mandatory?: boolean | null
          paper_id?: string
          sort_order?: number | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_unit_subjects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_unit_subjects_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "curriculum_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_unit_subjects_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_marks_distributions: {
        Row: {
          created_at: string
          deleted_at: string | null
          general_note: string | null
          id: string
          mcq_marks: number | null
          other_marks: number | null
          other_marks_type: string | null
          subject_selection_rules: Json
          total_marks: number | null
          total_time: number | null
          unit_id: string
          updated_at: string
          written_marks: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          general_note?: string | null
          id?: string
          mcq_marks?: number | null
          other_marks?: number | null
          other_marks_type?: string | null
          subject_selection_rules?: Json
          total_marks?: number | null
          total_time?: number | null
          unit_id: string
          updated_at?: string
          written_marks?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          general_note?: string | null
          id?: string
          mcq_marks?: number | null
          other_marks?: number | null
          other_marks_type?: string | null
          subject_selection_rules?: Json
          total_marks?: number | null
          total_time?: number | null
          unit_id?: string
          updated_at?: string
          written_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_marks_distributions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_requirement_batches: {
        Row: {
          batch_id: string
          id: string
          requirement_id: string
        }
        Insert: {
          batch_id: string
          id?: string
          requirement_id: string
        }
        Update: {
          batch_id?: string
          id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_req_batches_batch_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_req_batches_batch_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_req_batches_req_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "unit_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_requirements: {
        Row: {
          cluster_id: string | null
          college_id: string | null
          custom_checks: Json | null
          deleted_at: string | null
          group_id: string
          hsc_min_gpa: number | null
          hsc_min_gpa_without_4th: number | null
          hsc_year_max: number | null
          hsc_year_min: number | null
          id: string
          requirement_text: string | null
          ssc_min_gpa: number | null
          ssc_min_gpa_without_4th: number | null
          ssc_year_max: number | null
          ssc_year_min: number | null
          subject_requirements: Json | null
          total_min_gpa: number | null
          total_min_gpa_without_4th: number | null
          unit_id: string
          university_id: string | null
        }
        Insert: {
          cluster_id?: string | null
          college_id?: string | null
          custom_checks?: Json | null
          deleted_at?: string | null
          group_id: string
          hsc_min_gpa?: number | null
          hsc_min_gpa_without_4th?: number | null
          hsc_year_max?: number | null
          hsc_year_min?: number | null
          id?: string
          requirement_text?: string | null
          ssc_min_gpa?: number | null
          ssc_min_gpa_without_4th?: number | null
          ssc_year_max?: number | null
          ssc_year_min?: number | null
          subject_requirements?: Json | null
          total_min_gpa?: number | null
          total_min_gpa_without_4th?: number | null
          unit_id: string
          university_id?: string | null
        }
        Update: {
          cluster_id?: string | null
          college_id?: string | null
          custom_checks?: Json | null
          deleted_at?: string | null
          group_id?: string
          hsc_min_gpa?: number | null
          hsc_min_gpa_without_4th?: number | null
          hsc_year_max?: number | null
          hsc_year_min?: number | null
          id?: string
          requirement_text?: string | null
          ssc_min_gpa?: number | null
          ssc_min_gpa_without_4th?: number | null
          ssc_year_max?: number | null
          ssc_year_min?: number | null
          subject_requirements?: Json | null
          total_min_gpa?: number | null
          total_min_gpa_without_4th?: number | null
          unit_id?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_requirements_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_requirements_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_requirements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_requirements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "admission_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_requirements_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          admission_url: string | null
          calculator_allowed: boolean
          calculator_link: string | null
          category: string
          deleted_at: string | null
          description: string | null
          history: string | null
          history_source: Json | null
          id: string
          logo_url: string | null
          name_bn: string
          name_en: string
          negative_mark: number | null
          second_time: boolean
          second_time_condition: string | null
          short_name_bn: string
          short_name_en: string
          slug: string
          sub_category: string[] | null
          unit_change: string | null
          website_url: string | null
        }
        Insert: {
          admission_url?: string | null
          calculator_allowed?: boolean
          calculator_link?: string | null
          category: string
          deleted_at?: string | null
          description?: string | null
          history?: string | null
          history_source?: Json | null
          id?: string
          logo_url?: string | null
          name_bn: string
          name_en: string
          negative_mark?: number | null
          second_time?: boolean
          second_time_condition?: string | null
          short_name_bn: string
          short_name_en: string
          slug: string
          sub_category?: string[] | null
          unit_change?: string | null
          website_url?: string | null
        }
        Update: {
          admission_url?: string | null
          calculator_allowed?: boolean
          calculator_link?: string | null
          category?: string
          deleted_at?: string | null
          description?: string | null
          history?: string | null
          history_source?: Json | null
          id?: string
          logo_url?: string | null
          name_bn?: string
          name_en?: string
          negative_mark?: number | null
          second_time?: boolean
          second_time_condition?: string | null
          short_name_bn?: string
          short_name_en?: string
          slug?: string
          sub_category?: string[] | null
          unit_change?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          role_id: number
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          role_id: number
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          role_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "id_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["uid"]
          },
        ]
      }
      users: {
        Row: {
          authorized_apps: string[] | null
          avatar_url: string | null
          created_at: string | null
          deletion_limit_months: number | null
          email: string
          expired_at: string | null
          full_name: string
          is_banned: boolean | null
          last_login_at: string | null
          linked_providers: string[] | null
          mfa_backup_codes: string[] | null
          mfa_enabled: boolean | null
          mfa_secret: string | null
          pass: string
          passkey_challenge: string | null
          uid: string
          updated_at: string | null
          username: string
        }
        Insert: {
          authorized_apps?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          deletion_limit_months?: number | null
          email: string
          expired_at?: string | null
          full_name: string
          is_banned?: boolean | null
          last_login_at?: string | null
          linked_providers?: string[] | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          pass: string
          passkey_challenge?: string | null
          uid?: string
          updated_at?: string | null
          username: string
        }
        Update: {
          authorized_apps?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          deletion_limit_months?: number | null
          email?: string
          expired_at?: string | null
          full_name?: string
          is_banned?: boolean | null
          last_login_at?: string | null
          linked_providers?: string[] | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          pass?: string
          passkey_challenge?: string | null
          uid?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      users_with_roles: {
        Row: {
          authorized_apps: string[] | null
          avatar_url: string | null
          created_at: string | null
          deletion_limit_months: number | null
          email: string | null
          expired_at: string | null
          full_name: string | null
          is_banned: boolean | null
          last_login_at: string | null
          linked_providers: string[] | null
          mfa_backup_codes: string[] | null
          mfa_enabled: boolean | null
          mfa_secret: string | null
          pass: string | null
          passkey_challenge: string | null
          role: string[] | null
          uid: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          authorized_apps?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          deletion_limit_months?: number | null
          email?: string | null
          expired_at?: string | null
          full_name?: string | null
          is_banned?: boolean | null
          last_login_at?: string | null
          linked_providers?: string[] | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          pass?: string | null
          passkey_challenge?: string | null
          role?: never
          uid?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          authorized_apps?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          deletion_limit_months?: number | null
          email?: string | null
          expired_at?: string | null
          full_name?: string | null
          is_banned?: boolean | null
          last_login_at?: string | null
          linked_providers?: string[] | null
          mfa_backup_codes?: string[] | null
          mfa_enabled?: boolean | null
          mfa_secret?: string | null
          pass?: string | null
          passkey_challenge?: string | null
          role?: never
          uid?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      vw_batches: {
        Row: {
          id: string | null
          is_current: boolean | null
          name: string | null
          session: string | null
          year: number | null
        }
        Insert: {
          id?: string | null
          is_current?: boolean | null
          name?: string | null
          session?: never
          year?: number | null
        }
        Update: {
          id?: string | null
          is_current?: boolean | null
          name?: string | null
          session?: never
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_is_super_admin: { Args: never; Returns: boolean }
      cleanup_old_soft_deletes_and_logs: { Args: never; Returns: undefined }
      delete_inactive_users: { Args: never; Returns: undefined }
      delete_user_identity: {
        Args: { p_provider: string; p_user_id: string }
        Returns: undefined
      }
      file_stats: {
        Args: { f: Database["public"]["Tables"]["qb_files"]["Row"] }
        Returns: Json
      }
      get_audit_logs: {
        Args: { admin_uuid: string; filter_action?: string }
        Returns: {
          action: string
          created_at: string
          id: string
          new_data: Json
          old_data: Json
          table_name: string
          user_id: string
          user_name: string
        }[]
      }
      get_file_question_stats: {
        Args: { p_file_id: string }
        Returns: {
          total_questions: number
          total_verified: number
        }[]
      }
      get_recycled_items: { Args: { target_table: string }; Returns: Json }
      get_recycled_items_paginated: {
        Args: { page_limit: number; page_offset: number; target_table: string }
        Returns: {
          deleted_by_user: Json
          record: Json
          total_count: number
        }[]
      }
      get_student_activity_history: {
        Args: { p_days?: number; p_student_id: string; p_timezone?: string }
        Returns: {
          activity_date: string
          exam_taken: boolean
          present: boolean
          tasks_completed: number
        }[]
      }
      get_verified_questions_count: {
        Args: { p_file_id: string }
        Returns: number
      }
      start_practice_exam: {
        Args: {
          p_chapter_ids?: string[]
          p_limit?: number
          p_negative_mark?: number
          p_paper_ids?: string[]
          p_standard_ids?: string[]
          p_time_minutes?: number
          p_topic_ids?: string[]
        }
        Returns: Json
      }
      submit_practice_exam: {
        Args: { p_answers?: Json; p_practice_exam_id: string }
        Returns: Json
      }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "editor" | "moderator"
      course_status: "draft" | "published" | "end"
      order_status: "pending" | "approved" | "rejected"
      payment_method: "bkash" | "nagad" | "rocket"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_role: ["super_admin", "admin", "editor", "moderator"],
      course_status: ["draft", "published", "end"],
      order_status: ["pending", "approved", "rejected"],
      payment_method: ["bkash", "nagad", "rocket"],
    },
  },
} as const
