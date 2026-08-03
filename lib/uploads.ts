/**
 * Image uploads for owner-managed branding (logo) and promo banners.
 *
 * Objects are keyed under the shop's folder (`<shopId>/...`) so the storage RLS
 * policy can restrict writes to the owning shop. Path builders are pure and
 * unit-tested (see __tests__/shop.test.ts); the pick/upload helpers touch the
 * native picker + Supabase storage and are verified on device.
 *
 * NOTE: we upload an ArrayBuffer decoded from the asset's base64, NOT a Blob from
 * `fetch(uri)`. In React Native that Blob path uploads a 0-byte file, so images
 * never render — base64 → ArrayBuffer is the reliable approach.
 */

import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export { logoObjectPath, bannerObjectPath, portfolioObjectPath } from '@/lib/shop';

export type PickedImage = {
  base64: string;
  contentType: string;
  /** File extension (no dot), derived from the mime type — used to key the object. */
  ext: string;
};

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic')) return 'heic';
  return 'jpg';
}

/** Launch the library picker; returns the chosen image (base64) or null if cancelled/denied. */
export async function pickImage(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    base64: true,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.base64) return null;

  const contentType = asset.mimeType ?? 'image/jpeg';
  return { base64: asset.base64, contentType, ext: extFromMime(contentType) };
}

/**
 * Upload a picked image to `bucket/path` and return its public URL.
 * `upsert` so re-uploading a logo overwrites in place; cache-busted so it refreshes.
 */
export async function uploadImage(input: {
  bucket: 'branding' | 'banners' | 'portfolio';
  path: string;
  image: PickedImage;
}): Promise<string> {
  const { error } = await supabase.storage
    .from(input.bucket)
    .upload(input.path, decode(input.image.base64), {
      contentType: input.image.contentType,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(input.bucket).getPublicUrl(input.path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
