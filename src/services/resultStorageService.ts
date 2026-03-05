import { supabase } from "@/lib/supabase";

const BUCKET_NAME = "exam-results";

export interface StoredResult {
  id: string;
  path: string;
  publicUrl: string;
  fileName: string;
  createdAt: string;
  subjectName: string;
  studentId: string;
}

/**
 * Check if the exam-results bucket exists.
 * Bucket must be created via Supabase dashboard SQL:
 *   INSERT INTO storage.buckets (id, name, public) VALUES ('exam-results', 'exam-results', false);
 */
async function checkBucketExists(): Promise<boolean> {
  const { data: buckets } = await supabase.storage.listBuckets();
  return buckets?.some((b) => b.name === BUCKET_NAME) ?? false;
}

/**
 * Upload a .docx blob to Supabase storage under the student's folder.
 * Returns a signed URL valid for 1 year so the student can re-download anytime.
 */
export async function uploadExamResult(
  studentId: string,
  subjectName: string,
  blob: Blob
): Promise<StoredResult | null> {
  const bucketExists = await checkBucketExists();
  if (!bucketExists) {
    // Bucket not created yet — silently skip cloud backup
    return null;
  }

  const safeSubject = subjectName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const fileName = `EduXam_${safeSubject}_${dateStr}_${timeStr}.docx`;
  const filePath = `${studentId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, blob, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Create a signed URL valid for 1 year (max)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (signedError || !signedData) {
    throw new Error(`Failed to create download URL: ${signedError?.message}`);
  }

  return {
    id: filePath,
    path: filePath,
    publicUrl: signedData.signedUrl,
    fileName,
    createdAt: new Date().toISOString(),
    subjectName,
    studentId,
  };
}

/**
 * List all stored exam results for a student.
 */
export async function listStudentResults(studentId: string): Promise<StoredResult[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(studentId, { sortBy: { column: "created_at", order: "desc" } });

  if (error) {
    return [];
  }

  const results: StoredResult[] = [];

  for (const file of data ?? []) {
    const filePath = `${studentId}/${file.name}`;
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signedData) {
      // Parse subject name from filename: EduXam_SubjectName_date_time.docx
      const nameParts = file.name.replace(".docx", "").split("_");
      const subjectName = nameParts.slice(1, -2).join(" ") || "Exam";

      results.push({
        id: filePath,
        path: filePath,
        publicUrl: signedData.signedUrl,
        fileName: file.name,
        createdAt: file.created_at ?? new Date().toISOString(),
        subjectName,
        studentId,
      });
    }
  }

  return results;
}

/**
 * Delete a stored result from Supabase storage.
 */
export async function deleteStoredResult(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/**
 * Get a fresh download URL for an existing stored result.
 */
export async function getResultDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 60 * 60); // 1 hour

  if (error || !data) throw new Error(`Failed to get download URL: ${error?.message}`);
  return data.signedUrl;
}
