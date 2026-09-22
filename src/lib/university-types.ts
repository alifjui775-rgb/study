// =============================================================================
// University Details Page — Type Definitions
// Maps 1-to-1 with the normalized Supabase PostgreSQL schema.
// =============================================================================

// --- Core Tables ---

export type University = {
  id: string;
  slug: string;
  name_bn: string;
  name_en?: string | null;
  short_name?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  description?: string | null;
  history?: string | null;
  website_url?: string | null;
  established_year?: number | null;
  location?: string | null;
  history_source?: { label: string; url: string }[] | null;
  category: string;
  sub_category?: string[] | null;
  second_time?: boolean | null;
  second_time_condition?: string | null;
  negative_mark?: number | null;
  calculator_allowed?: boolean | null;
  calculator_link?: string | null;
  parent_university_name?: string | null;
  parent_university_count?: number | null;
  created_at: string;
};

export type UniversityUnit = {
  id: string;
  university_id: string;
  unit_name_bn: string;
  unit_name_en?: string | null;
  unit_slug: string;
  primary_group_id?: string | null;
  allowed_group_ids?: string[] | null;
  exam_center_note?: string | null;
  exam_center_link?: string | null;
  calculator_allowed?: boolean | null;
  calculator_link?: string | null;
  sort_order: number;
  created_at: string;
};

export type DegreeProgram = {
  id: string;
  slug: string;
  short_name: string;
  full_name_en: string;
  full_name_bn?: string | null;
  description?: string | null;
  review?: string | null;
  review_sources?: any;
  created_at: string;
};

export type UniversitySubject = {
  id: string;
  university_id: string;
  unit_id: string;
  degree_program_id: string;
  created_at: string;
  // Joined from degree_programs
  degree_program?: DegreeProgram | null;
};

export type SubjectGroupSeat = {
  id: string;
  university_subject_id: string;
  unit_id: string;
  group_name?: string | null; // e.g. 'Science', 'Humanities'
  seat_count: number;
  created_at: string;
  // Joined
  university_subject?: UniversitySubject | null;
};

export type ExamSchedule = {
  id: string;
  university_id: string;
  unit_id?: string | null;
  exam_datetime: string; // ISO timestamp
  venue?: string | null;
  notes?: string | null;
  created_at: string;
  // Joined
  unit?: UniversityUnit | null;
  batch?: { id: string; name: string; name_bn?: string; year: number; is_current: boolean } | null;
};

export type ApplicationDetail = {
  id: string;
  university_id: string;
  batch_id: string;
  unit_id?: string | null;
  phase?: string | null; // e.g. 'Phase 1', 'Phase 2'
  start_date?: string | null; // legacy
  end_date?: string | null; // legacy
  start_datetime?: string | null;
  end_datetime?: string | null;
  fee?: number | null;
  apply_url?: string | null;
  payment_method?: string | null; // legacy
  fee_payment_method?: string | null;
  notes?: string | null; // legacy
  note?: string | null;
  helpful_links?: { label: string; url: string }[] | null;
  created_at: string;
  // Joined
  unit?: UniversityUnit | null;
  application_units?: { unit_id: string }[];
  batch?: {
    id: string;
    name: string;
    name_bn?: string;
    name_en?: string;
    year?: number;
    is_current?: boolean;
  } | null;
};

export type AdmitCardDetail = {
  id: string;
  university_id: string;
  batch_id: string;
  download_start_datetime?: string | null;
  download_end_datetime?: string | null;
  admit_card_url?: string | null;
  note?: string | null;
  created_at: string;
  admit_card_units?: { unit_id: string }[];
  batch?: {
    id: string;
    name: string;
    name_bn?: string;
    year?: number;
  } | null;
};

export type Batch = {
  id: string;
  name: string;
  name_bn?: string | null;
  name_en?: string | null;
  year: number;
  is_current: boolean;
};

export type ResultDetail = {
  id: string;
  university_id?: string | null;
  cluster_id?: string | null;
  college_id?: string | null;
  batch_id: string;
  result_datetime?: string | null;
  result_url?: string | null;
  others_links?: { label: string; url: string }[] | null;
  note?: string | null;
  created_at?: string;
  result_units?: { unit_id: string }[];
  batch?: {
    id: string;
    name: string;
    name_bn?: string;
    name_en?: string;
    year?: number;
    is_current?: boolean;
  } | null;
};

export type Circular = {
  id: string;
  university_id: string;
  batch_id: string;
  title: string;
  download_url?: string | null;
  note?: string | null;
  circular_units?: { unit_id: string }[];
  batch?: {
    id: string;
    name: string;
    name_bn?: string;
    name_en?: string;
    year?: number;
    is_current?: boolean;
  } | null;
};

export type UniversityLink = {
  id: string;
  university_id: string;
  label: string;
  label_bn?: string | null;
  url: string;
  icon?: string | null; // lucide icon name
  sort_order?: number | null;
  created_at: string;
};

export type UniversityGeneralInfo = {
  id: string;
  university_id: string;
  key: string; // e.g. 'syllabus', 'calculator_policy'
  label_bn?: string | null;
  label_en?: string | null;
  value: string;
  sort_order?: number | null;
  created_at: string;
};

export type MapLocation = {
  id: string;
  university_id: string;
  category: string;
  name: string;
  google_maps_url: string;
  lat: number | null;
  lng: number | null;
  tooltip: string | null;
  sort_order: number;
  created_at?: string;
};

export type UnitRequirement = {
  id: string;
  unit_id: string;
  university_id?: string | null;
  cluster_id?: string | null;
  college_id?: string | null;
  group_name?: string | null;
  min_gpa_ssc?: number | null;
  min_gpa_hsc?: number | null;
  min_total_gpa?: number | null;
  required_subjects?: string | null;
  notes?: string | null;
  ssc_year_min?: number | null;
  ssc_year_max?: number | null;
  hsc_year_min?: number | null;
  hsc_year_max?: number | null;
  ssc_min_gpa?: number | null;
  hsc_min_gpa?: number | null;
  total_min_gpa?: number | null;
  ssc_min_gpa_without_4th?: number | null;
  hsc_min_gpa_without_4th?: number | null;
  total_min_gpa_without_4th?: number | null;
  requirement_text?: string | null;
  subject_requirements?: any;
  custom_checks?: any;
  created_at: string;
  unit?: UniversityUnit | null;
  group?: { name_bn: string; name_en: string } | null;
  unit_requirement_batches?: {
    batch_id: string;
    batch?: {
      id: string;
      name: string;
      name_bn?: string;
      name_en?: string;
      year?: number;
      is_current?: boolean;
    } | null;
  }[];
};

// --- Composite / Aggregated Types for the page ---

/** A unit with its subjects, seat info, requirements, and schedule */
export type UnitWithDetails = UniversityUnit & {
  subjects: (UniversitySubject & {
    degree_program: DegreeProgram;
    seats: SubjectGroupSeat[];
  })[];
  requirements: UnitRequirement[];
  exam_schedule: ExamSchedule | null;
  application_details: ApplicationDetail[];
  admit_card_details: AdmitCardDetail[];
  result_details: ResultDetail[];
};

/** Full data payload for a single university page */
export type UniversityPageData = {
  university: University;
  units: UnitWithDetails[];
  circulars: Circular[];
  links: UniversityLink[];
  general_info: UniversityGeneralInfo[];
  map_locations: MapLocation[];
  dynamic_notes: DynamicNote[];
  available_batches: Batch[];
  // Computed aggregates
  total_seats: number;
  total_units: number;
};

export type DynamicNote = {
  id: string;
  university_id: string | null;
  college_id: string | null;
  cluster_id: string | null;
  unit_id: string | null;
  display_section: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};
