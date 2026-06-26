/**
 * Hand-maintained types mirroring the Supabase schema (see supabase/migrations).
 * Regenerate with `supabase gen types typescript` once the project is linked, if preferred.
 */

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type UserRole = 'customer' | 'barber';

/** `working_hours` jsonb: weekday key → [openHHmm, closeHHmm] or null when closed. */
export type WorkingHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', [string, string] | null>
>;

/** Brand color overrides per scheme; keys are a curated subset of theme tokens. */
export type BrandColors = {
  light?: Record<string, string>;
  dark?: Record<string, string>;
};

export interface Shop {
  id: string;
  name: string | null;
  location: string | null;
  owner_id: string | null;
  logo_url: string | null;
  colors: BrandColors;
}

/** Anon-readable branding projection of `shops` (see the shop_public view). */
export type ShopBranding = Pick<Shop, 'id' | 'name' | 'logo_url' | 'colors'>;

export interface Banner {
  id: string;
  shop_id: string;
  image_url: string;
  title: string | null;
  sort_order: number;
  active: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  shop_id: string | null;
}

export interface BarberProfile {
  id: string; // → profiles.id
  shop_id: string | null;
  title: string | null;
  bio: string | null;
  working_hours: WorkingHours;
}

export interface Service {
  id: string;
  barber_id: string;
  shop_id: string | null;
  name: string;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  customer_id: string;
  barber_id: string;
  service_id: string;
  shop_id: string | null;
  start_time: string; // ISO timestamptz
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}
