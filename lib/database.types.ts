/**
 * Hand-maintained types mirroring the Supabase schema (see supabase/migrations).
 * Regenerate with `supabase gen types typescript` once the project is linked, if preferred.
 */

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';
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
  /** Owner-gated: unapproved staff are hidden from customers and unbookable. */
  approved: boolean;
}

export interface Service {
  id: string;
  barber_id: string;
  shop_id: string | null;
  name: string;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
  /** Optional upfront deposit (cents). 0 = no deposit required to book. */
  deposit_cents: number;
}

export type PaymentStatus = 'none' | 'pending' | 'paid' | 'refunded';

export interface PortfolioImage {
  id: string;
  shop_id: string;
  barber_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface PromoCode {
  id: string;
  shop_id: string;
  code: string;
  kind: 'percent' | 'amount';
  value: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface TimeOff {
  id: string;
  shop_id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  shop_id: string;
  appointment_id: string;
  customer_id: string;
  barber_id: string;
  rating: number; // 1..5
  comment: string | null;
  created_at: string;
}

export interface BarberRating {
  barber_id: string;
  avg_rating: number;
  review_count: number;
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
  payment_status: PaymentStatus;
  payment_intent_id: string | null;
  created_at: string;
}
