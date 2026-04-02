import { supabase } from '@/lib/supabase';

// ===========================================
//  AVATAR UPLOAD (public bucket)
// ===========================================

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('Avatar must be under 5MB');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Avatar must be a JPEG, PNG, WebP, or GIF image');
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  // Cache-bust so browsers show the new image immediately
  return data.publicUrl + '?t=' + Date.now();
}

export async function deleteAvatar(_userId: string, currentUrl: string): Promise<void> {
  const parts = currentUrl.split(`${AVATAR_BUCKET}/`);
  if (parts.length < 2) return;
  // Strip query params from the path
  const filePath = parts[1].split('?')[0];

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath]);
  if (error) throw new Error(`Avatar delete failed: ${error.message}`);
}

// ===========================================
//  CERTIFICATE IMAGE UPLOAD (private bucket)
// ===========================================

const CERT_BUCKET = 'certificates';
const MAX_CERT_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadCertificateImage(userId: string, file: File): Promise<string> {
  if (file.size > MAX_CERT_SIZE) {
    throw new Error('Certificate image must be under 5MB');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Certificate must be a JPEG, PNG, WebP, or PDF');
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/cert_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(CERT_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`Certificate upload failed: ${uploadError.message}`);

  const { data, error: signedError } = await supabase.storage
    .from(CERT_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

  if (signedError || !data) throw new Error(`Failed to create certificate URL: ${signedError?.message}`);
  return data.signedUrl;
}

export async function deleteCertificateImage(imageUrl: string): Promise<void> {
  const match = imageUrl.match(/\/certificates\/([^?]+)/);
  if (!match) return;
  const filePath = decodeURIComponent(match[1]);

  const { error } = await supabase.storage.from(CERT_BUCKET).remove([filePath]);
  if (error) throw new Error(`Certificate delete failed: ${error.message}`);
}
