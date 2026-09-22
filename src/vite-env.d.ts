/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_CSV_API_BASE_URL: string;
  readonly VITE_CSV_API_KEY: string;
  readonly VITE_YOUTUBE_API_KEY?: string;
  readonly VITE_SITE_NAME?: string;
  readonly VITE_SITE_SLOGAN?: string;
  readonly VITE_META_DESCRIPTION?: string;
  readonly VITE_FAVICON_URL?: string;
  readonly VITE_ICON_URL?: string;
  readonly VITE_LOGO_HEADER?: string;
  readonly VITE_LOGO_DARK_MODE?: string;
  readonly VITE_OG_IMAGE?: string;
  readonly VITE_PRIMARY_COLOR?: string;
  readonly VITE_PRIMARY_SHIFT_COLOR?: string;
  readonly VITE_SECONDARY_COLOR?: string;
  readonly VITE_PRIMARY_DARK_COLOR?: string;
  readonly VITE_PRIMARY_DARK_SHIFT_COLOR?: string;
  readonly VITE_SECONDARY_DARK_COLOR?: string;
  readonly VITE_MNR_CLIENT_ID?: string;
  readonly VITE_MNR_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
