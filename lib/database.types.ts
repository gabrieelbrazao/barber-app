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

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
}

export interface BarberProfile {
  id: string; // → profiles.id
  shop_name: string | null;
  bio: string | null;
  location: string | null;
  working_hours: WorkingHours;
}

export interface Service {
  id: string;
  barber_id: string;
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
  start_time: string; // ISO timestamptz
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}
