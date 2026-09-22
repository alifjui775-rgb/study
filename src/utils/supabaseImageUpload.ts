import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp",
  initialQuality: 0.85,
};

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, COMPRESSION_OPTIONS);
}

export async function uploadCourseCover(
  file: File,
  onProgress?: (stage: "compressing" | "uploading") => void,
): Promise<string> {
  onProgress?.("compressing");
  const compressed = await compressImage(file);

  onProgress?.("uploading");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!anonKey) {
    throw new Error("Supabase key is not configured");
  }

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const fileName = `${timestamp}-${randomId}.webp`;
  const filePath = `covers/${fileName}`;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/course_covers/${filePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": compressed.type,
    },
    body: compressed,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("ছবি আপলোড করা যায়নি: " + errText);
  }

  return `${supabaseUrl}/storage/v1/object/public/course_covers/${filePath}`;
}

export async function deleteCourseCover(filePath: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!anonKey) {
    throw new Error("Supabase key is not configured");
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/course_covers/${filePath}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error("ছবি মুছে ফেলা যায়নি: " + errText);
  }
}
