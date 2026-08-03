import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Appointment,
  AppointmentStatus,
  Banner,
  BarberProfile,
  BarberRating,
  BrandColors,
  PortfolioImage,
  PromoCode,
  Review,
  Service,
  Shop,
  ShopBranding,
  TimeOff,
  WorkingHours,
} from '@/lib/database.types';
import type { AnalyticsRange, ShopAnalytics } from '@/lib/analytics';
import { SHOP_ID } from '@/lib/config';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// View shapes (flattened from joins for the UI)
// ---------------------------------------------------------------------------

export type BarberListItem = {
  id: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
};

export type BarberDetail = BarberListItem & {
  bio: string | null;
  workingHours: WorkingHours;
};

export type AppointmentView = {
  id: string;
  serviceName: string;
  /** Barber name (customer view) or customer name (barber view). */
  partyName: string;
  /** The booking's barber (used by the customer to leave a review). */
  barberId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const qk = {
  barbers: ['barbers'] as const,
  barber: (id: string) => ['barber', id] as const,
  shopStaff: ['staff', SHOP_ID] as const,
  barberRating: (id: string) => ['barber-rating', id] as const,
  barberReviews: (id: string) => ['barber-reviews', id] as const,
  appointmentReview: (id: string) => ['appointment-review', id] as const,
  services: (barberId: string) => ['services', barberId] as const,
  shop: ['shop', SHOP_ID] as const,
  shopBranding: ['shop', 'branding', SHOP_ID] as const,
  banners: ['banners', SHOP_ID] as const,
  myAppointments: (uid: string) => ['appointments', 'customer', uid] as const,
  barberAppointments: (uid: string) => ['appointments', 'barber', uid] as const,
  dayAppointments: (barberId: string, dayISO: string) =>
    ['appointments', 'day', barberId, dayISO] as const,
  dayBlocks: (barberId: string, dayISO: string) => ['blocks', 'day', barberId, dayISO] as const,
  timeOff: (barberId: string) => ['time-off', barberId] as const,
  promoCodes: ['promo-codes', SHOP_ID] as const,
  loyalty: (uid: string) => ['loyalty', uid] as const,
  portfolio: (barberId: string) => ['portfolio', barberId] as const,
  barberWaitlist: (barberId: string) => ['waitlist', barberId] as const,
};

// ---------------------------------------------------------------------------
// Shop & branding (this build's single shop, pinned by SHOP_ID)
// ---------------------------------------------------------------------------

/** Anon-readable branding (works before login) — feeds the theme + logo. */
export function useShopBranding() {
  return useQuery({
    queryKey: qk.shopBranding,
    queryFn: async (): Promise<ShopBranding> => {
      const { data, error } = await supabase
        .from('shop_public')
        .select('id, name, logo_url, colors')
        .eq('id', SHOP_ID)
        .single();
      if (error) throw error;
      return data as ShopBranding;
    },
  });
}

/** Full shop row (members only) — used by the owner admin screen. */
export function useShop() {
  return useQuery({
    queryKey: qk.shop,
    queryFn: async (): Promise<Shop> => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, location, owner_id, logo_url, colors')
        .eq('id', SHOP_ID)
        .single();
      if (error) throw error;
      return data as Shop;
    },
  });
}

export function useBanners(includeInactive = false) {
  return useQuery({
    queryKey: [...qk.banners, { includeInactive }],
    queryFn: async (): Promise<Banner[]> => {
      let q = supabase
        .from('banners')
        .select('*')
        .eq('shop_id', SHOP_ID)
        .order('sort_order');
      if (!includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Banner[];
    },
  });
}

// ---------------------------------------------------------------------------
// Barbers & services
// ---------------------------------------------------------------------------

type BarberRow = Pick<BarberProfile, 'id' | 'title' | 'bio' | 'working_hours'> & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

function toBarberDetail(row: BarberRow): BarberDetail {
  return {
    id: row.id,
    name: row.profiles?.full_name ?? 'Barber',
    title: row.title,
    avatarUrl: row.profiles?.avatar_url ?? null,
    bio: row.bio,
    workingHours: row.working_hours,
  };
}

const BARBER_SELECT = 'id, title, bio, working_hours, profiles!inner(full_name, avatar_url)';

/** This shop's *approved* staff, shown to customers (RLS also scopes to the shop). */
export function useBarbers() {
  return useQuery({
    queryKey: qk.barbers,
    queryFn: async (): Promise<BarberListItem[]> => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select(BARBER_SELECT)
        .eq('shop_id', SHOP_ID)
        .eq('approved', true)
        .order('title', { nullsFirst: false });
      if (error) throw error;
      return (data as unknown as BarberRow[]).map(toBarberDetail);
    },
  });
}

export type StaffMember = BarberListItem & { approved: boolean };

/** All staff (approved or not) — owner-only roster for the Equipe screen. */
export function useShopStaff() {
  return useQuery({
    queryKey: qk.shopStaff,
    queryFn: async (): Promise<StaffMember[]> => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id, title, approved, profiles!inner(full_name, avatar_url)')
        .eq('shop_id', SHOP_ID)
        .order('approved')
        .order('title', { nullsFirst: false });
      if (error) throw error;
      type Row = Pick<BarberProfile, 'id' | 'title' | 'approved'> & {
        profiles: { full_name: string | null; avatar_url: string | null } | null;
      };
      return (data as unknown as Row[]).map((r) => ({
        id: r.id,
        name: r.profiles?.full_name ?? 'Barbeiro',
        title: r.title,
        avatarUrl: r.profiles?.avatar_url ?? null,
        approved: r.approved,
      }));
    },
  });
}

/** Owner approves/revokes a staff member via the security-definer RPC. */
export function useSetStaffApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { staffId: string; approved: boolean }) => {
      const { error } = await supabase.rpc('set_staff_approval', {
        p_staff_id: input.staffId,
        p_approved: input.approved,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shopStaff });
      qc.invalidateQueries({ queryKey: qk.barbers });
    },
  });
}

export function useBarber(id: string) {
  return useQuery({
    queryKey: qk.barber(id),
    enabled: !!id,
    queryFn: async (): Promise<BarberDetail> => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select(BARBER_SELECT)
        .eq('id', id)
        .single();
      if (error) throw error;
      return toBarberDetail(data as unknown as BarberRow);
    },
  });
}

export function useServices(barberId: string, includeInactive = false) {
  return useQuery({
    queryKey: [...qk.services(barberId), { includeInactive }],
    enabled: !!barberId,
    queryFn: async (): Promise<Service[]> => {
      let q = supabase.from('services').select('*').eq('barber_id', barberId).order('price_cents');
      if (!includeInactive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Service[];
    },
  });
}

// ---------------------------------------------------------------------------
// Reviews & ratings
// ---------------------------------------------------------------------------

export type ReviewView = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
};

/** Aggregate rating for a barber (null when there are no reviews yet). */
export function useBarberRating(barberId: string) {
  return useQuery({
    queryKey: qk.barberRating(barberId),
    enabled: !!barberId,
    queryFn: async (): Promise<BarberRating | null> => {
      const { data, error } = await supabase
        .from('barber_ratings')
        .select('barber_id, avg_rating, review_count')
        .eq('barber_id', barberId)
        .maybeSingle();
      if (error) throw error;
      return (data as BarberRating) ?? null;
    },
  });
}

export function useBarberReviews(barberId: string) {
  return useQuery({
    queryKey: qk.barberReviews(barberId),
    enabled: !!barberId,
    queryFn: async (): Promise<ReviewView[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, customer:profiles!reviews_customer_id_fkey(full_name)')
        .eq('barber_id', barberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      type Row = Pick<Review, 'id' | 'rating' | 'comment' | 'created_at'> & {
        customer: { full_name: string | null } | null;
      };
      return (data as unknown as Row[]).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.customer?.full_name ?? 'Cliente',
        createdAt: r.created_at,
      }));
    },
  });
}

/** The caller's existing review for an appointment, if any (drives "Avaliar" vs done). */
export function useMyReviewForAppointment(appointmentId: string) {
  return useQuery({
    queryKey: qk.appointmentReview(appointmentId),
    enabled: !!appointmentId,
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      if (error) throw error;
      return (data as Review) ?? null;
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      appointmentId: string;
      barberId: string;
      customerId: string;
      rating: number;
      comment: string | null;
    }) => {
      const { error } = await supabase.from('reviews').insert({
        appointment_id: input.appointmentId,
        barber_id: input.barberId,
        customer_id: input.customerId,
        shop_id: SHOP_ID,
        rating: input.rating,
        comment: input.comment,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.appointmentReview(v.appointmentId) });
      qc.invalidateQueries({ queryKey: qk.barberRating(v.barberId) });
      qc.invalidateQueries({ queryKey: qk.barberReviews(v.barberId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Appointments — reads
// ---------------------------------------------------------------------------

const APPOINTMENT_SELECT =
  'id, start_time, end_time, status, services(name), barber:barber_profiles(id, profiles!inner(full_name)), customer:profiles!appointments_customer_id_fkey(full_name)';

type AppointmentRow = Pick<Appointment, 'id' | 'start_time' | 'end_time' | 'status'> & {
  services: { name: string } | null;
  barber: { id: string; profiles: { full_name: string | null } | null } | null;
  customer: { full_name: string | null } | null;
};

function toView(row: AppointmentRow, party: 'barber' | 'customer'): AppointmentView {
  const partyName =
    party === 'barber'
      ? row.barber?.profiles?.full_name ?? 'Barber'
      : row.customer?.full_name ?? 'Customer';
  return {
    id: row.id,
    serviceName: row.services?.name ?? 'Service',
    partyName,
    barberId: row.barber?.id ?? '',
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  };
}

export function useMyAppointments(customerId: string) {
  return useQuery({
    queryKey: qk.myAppointments(customerId),
    enabled: !!customerId,
    queryFn: async (): Promise<AppointmentView[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('customer_id', customerId)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return (data as unknown as AppointmentRow[]).map((r) => toView(r, 'barber'));
    },
  });
}

export function useBarberAppointments(barberId: string) {
  return useQuery({
    queryKey: qk.barberAppointments(barberId),
    enabled: !!barberId,
    queryFn: async (): Promise<AppointmentView[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('barber_id', barberId)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data as unknown as AppointmentRow[]).map((r) => toView(r, 'customer'));
    },
  });
}

/** Non-cancelled bookings for a barber within [dayStart, dayEnd) — feeds availability. */
export function useDayAppointments(barberId: string, dayStart: Date) {
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return useQuery({
    queryKey: qk.dayAppointments(barberId, dayStart.toISOString().slice(0, 10)),
    enabled: !!barberId,
    queryFn: async (): Promise<{ start: string; end: string }[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('barber_id', barberId)
        .neq('status', 'cancelled')
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString());
      if (error) throw error;
      return (data as { start_time: string; end_time: string }[]).map((r) => ({
        start: r.start_time,
        end: r.end_time,
      }));
    },
  });
}

/** Time-off ranges overlapping `dayStart`'s 24h window — feeds availability. */
export function useDayBlocks(barberId: string, dayStart: Date) {
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return useQuery({
    queryKey: qk.dayBlocks(barberId, dayStart.toISOString().slice(0, 10)),
    enabled: !!barberId,
    queryFn: async (): Promise<{ start: string; end: string }[]> => {
      const { data, error } = await supabase
        .from('time_off')
        .select('starts_at, ends_at')
        .eq('barber_id', barberId)
        .lt('starts_at', dayEnd.toISOString())
        .gt('ends_at', dayStart.toISOString());
      if (error) throw error;
      return (data as { starts_at: string; ends_at: string }[]).map((r) => ({
        start: r.starts_at,
        end: r.ends_at,
      }));
    },
  });
}

/** Upcoming time-off for a barber's own management screen. */
export function useBarberTimeOff(barberId: string) {
  return useQuery({
    queryKey: qk.timeOff(barberId),
    enabled: !!barberId,
    queryFn: async (): Promise<TimeOff[]> => {
      const { data, error } = await supabase
        .from('time_off')
        .select('*')
        .eq('barber_id', barberId)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at');
      if (error) throw error;
      return data as TimeOff[];
    },
  });
}

export function useSaveTimeOff(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startsAt: Date; endsAt: Date; reason: string | null }) => {
      const { error } = await supabase.from('time_off').insert({
        barber_id: barberId,
        shop_id: SHOP_ID,
        starts_at: input.startsAt.toISOString(),
        ends_at: input.endsAt.toISOString(),
        reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.timeOff(barberId) });
      qc.invalidateQueries({ queryKey: ['blocks', 'day', barberId] });
    },
  });
}

export function useDeleteTimeOff(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_off').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.timeOff(barberId) });
      qc.invalidateQueries({ queryKey: ['blocks', 'day', barberId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customerId: string;
      barberId: string;
      serviceId: string;
      start: Date;
      end: Date;
      promoCodeId?: string | null;
      discountCents?: number;
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          customer_id: input.customerId,
          barber_id: input.barberId,
          service_id: input.serviceId,
          shop_id: SHOP_ID,
          start_time: input.start.toISOString(),
          end_time: input.end.toISOString(),
          status: 'pending',
          promo_code_id: input.promoCodeId ?? null,
          discount_cents: input.discountCents ?? 0,
        })
        .select('id')
        .single();
      if (error) {
        // 23P01 = exclusion_violation from the appointments_no_overlap constraint:
        // someone took this slot between loading the picker and confirming.
        if (error.code === '23P01') {
          throw new AppError('Esse horário acabou de ser reservado. Escolha outro.');
        }
        throw error;
      }
      return (data as { id: string }).id;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.myAppointments(v.customerId) });
      qc.invalidateQueries({ queryKey: qk.barberAppointments(v.barberId) });
      qc.invalidateQueries({ queryKey: ['appointments', 'day', v.barberId] });
    },
  });
}

/** Service duration (minutes) behind an appointment — feeds the reschedule slot grid. */
export function useAppointmentDuration(appointmentId: string) {
  return useQuery({
    queryKey: ['appointment-duration', appointmentId],
    enabled: !!appointmentId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('appointments')
        .select('services(duration_minutes)')
        .eq('id', appointmentId)
        .single();
      if (error) throw error;
      const row = data as unknown as { services: { duration_minutes: number } | null };
      return row.services?.duration_minutes ?? 30;
    },
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      barberId: string;
      customerId: string;
      start: Date;
      end: Date;
    }) => {
      const { error } = await supabase.rpc('reschedule_appointment', {
        p_id: input.id,
        p_start: input.start.toISOString(),
        p_end: input.end.toISOString(),
      });
      if (error) {
        // 23P01 = the no-overlap exclusion constraint: the new slot was just taken.
        if (error.code === '23P01') {
          throw new AppError('Esse horário acabou de ser reservado. Escolha outro.');
        }
        throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.myAppointments(v.customerId) });
      qc.invalidateQueries({ queryKey: qk.barberAppointments(v.barberId) });
      qc.invalidateQueries({ queryKey: ['appointments', 'day', v.barberId] });
    },
  });
}

export function useCancelAppointment(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.myAppointments(customerId) });
      qc.invalidateQueries({ queryKey: ['appointments', 'day'] });
    },
  });
}

export function useUpdateAppointmentStatus(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.barberAppointments(barberId) });
      qc.invalidateQueries({ queryKey: ['appointments', 'day', barberId] });
    },
  });
}

export function useSaveService(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      priceCents: number;
      durationMinutes: number;
      depositCents?: number;
      active?: boolean;
    }) => {
      const payload = {
        barber_id: barberId,
        shop_id: SHOP_ID,
        name: input.name,
        price_cents: input.priceCents,
        duration_minutes: input.durationMinutes,
        deposit_cents: input.depositCents ?? 0,
        active: input.active ?? true,
      };
      const query = input.id
        ? supabase.from('services').update(payload).eq('id', input.id)
        : supabase.from('services').insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.services(barberId) }),
  });
}

export function useDeleteService(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from('services').delete().eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.services(barberId) }),
  });
}

// ---------------------------------------------------------------------------
// Owner-only: shop identity, branding & banners
// ---------------------------------------------------------------------------

export function useUpdateShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name?: string | null;
      location?: string | null;
      logoUrl?: string | null;
      colors?: BrandColors;
    }) => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.location !== undefined) payload.location = input.location;
      if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl;
      if (input.colors !== undefined) payload.colors = input.colors;
      const { error } = await supabase.from('shops').update(payload).eq('id', SHOP_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shop });
      qc.invalidateQueries({ queryKey: qk.shopBranding });
    },
  });
}

export function useSaveBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      imageUrl: string;
      title?: string | null;
      sortOrder?: number;
      active?: boolean;
    }) => {
      const payload = {
        shop_id: SHOP_ID,
        image_url: input.imageUrl,
        title: input.title ?? null,
        sort_order: input.sortOrder ?? 0,
        active: input.active ?? true,
      };
      const query = input.id
        ? supabase.from('banners').update(payload).eq('id', input.id)
        : supabase.from('banners').insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.banners }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bannerId: string) => {
      const { error } = await supabase.from('banners').delete().eq('id', bannerId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.banners }),
  });
}

// ---------------------------------------------------------------------------
// Promo codes (owner-managed) + loyalty
// ---------------------------------------------------------------------------

export function usePromoCodes() {
  return useQuery({
    queryKey: qk.promoCodes,
    queryFn: async (): Promise<PromoCode[]> => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('shop_id', SHOP_ID)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PromoCode[];
    },
  });
}

export function useSavePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      code: string;
      kind: 'percent' | 'amount';
      value: number;
      active?: boolean;
    }) => {
      const payload = {
        shop_id: SHOP_ID,
        code: input.code.trim().toUpperCase(),
        kind: input.kind,
        value: input.value,
        active: input.active ?? true,
      };
      const query = input.id
        ? supabase.from('promo_codes').update(payload).eq('id', input.id)
        : supabase.from('promo_codes').insert(payload);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.promoCodes }),
  });
}

export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.promoCodes }),
  });
}

export type RedeemedPromo = { promoId: string; kind: 'percent' | 'amount'; value: number };

/** Validate a code server-side; resolves null when it's invalid/expired. */
export function useRedeemPromo() {
  return useMutation({
    mutationFn: async (code: string): Promise<RedeemedPromo | null> => {
      const { data, error } = await supabase.rpc('redeem_promo', { p_code: code.trim() });
      if (error) throw error;
      const row = (data as { promo_id: string; kind: 'percent' | 'amount'; value: number }[])?.[0];
      return row ? { promoId: row.promo_id, kind: row.kind, value: row.value } : null;
    },
  });
}

// ---------------------------------------------------------------------------
// Barber portfolio
// ---------------------------------------------------------------------------

export function useBarberPortfolio(barberId: string) {
  return useQuery({
    queryKey: qk.portfolio(barberId),
    enabled: !!barberId,
    queryFn: async (): Promise<PortfolioImage[]> => {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('barber_id', barberId)
        .order('sort_order')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PortfolioImage[];
    },
  });
}

export function useAddPortfolioImage(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { imageUrl: string; caption?: string | null; sortOrder?: number }) => {
      const { error } = await supabase.from('portfolio_images').insert({
        barber_id: barberId,
        shop_id: SHOP_ID,
        image_url: input.imageUrl,
        caption: input.caption ?? null,
        sort_order: input.sortOrder ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.portfolio(barberId) }),
  });
}

export function useDeletePortfolioImage(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_images').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.portfolio(barberId) }),
  });
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export type WaitlistView = {
  id: string;
  customerName: string;
  serviceName: string;
  desiredDate: string;
};

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: async (input: {
      customerId: string;
      barberId: string;
      serviceId: string;
      desiredDate: Date;
    }) => {
      const { error } = await supabase.from('waitlist').insert({
        customer_id: input.customerId,
        barber_id: input.barberId,
        service_id: input.serviceId,
        shop_id: SHOP_ID,
        desired_date: input.desiredDate.toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
  });
}

/** Waiting entries for a barber (their roster of people to fit in). */
export function useBarberWaitlist(barberId: string) {
  return useQuery({
    queryKey: qk.barberWaitlist(barberId),
    enabled: !!barberId,
    queryFn: async (): Promise<WaitlistView[]> => {
      const { data, error } = await supabase
        .from('waitlist')
        .select(
          'id, desired_date, services(name), customer:profiles!waitlist_customer_id_fkey(full_name)'
        )
        .eq('barber_id', barberId)
        .eq('status', 'waiting')
        .order('desired_date');
      if (error) throw error;
      type Row = {
        id: string;
        desired_date: string;
        services: { name: string } | null;
        customer: { full_name: string | null } | null;
      };
      return (data as unknown as Row[]).map((r) => ({
        id: r.id,
        customerName: r.customer?.full_name ?? 'Cliente',
        serviceName: r.services?.name ?? 'Serviço',
        desiredDate: r.desired_date,
      }));
    },
  });
}

/** Barber clears a waitlist entry (booked them in / no longer needed). */
export function useResolveWaitlist(barberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('waitlist').update({ status: 'fulfilled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.barberWaitlist(barberId) }),
  });
}

// ---------------------------------------------------------------------------
// Owner analytics
// ---------------------------------------------------------------------------

export function useShopAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ['analytics', SHOP_ID, range.from.toISOString(), range.to.toISOString()],
    queryFn: async (): Promise<ShopAnalytics> => {
      const { data, error } = await supabase.rpc('shop_analytics', {
        p_from: range.from.toISOString(),
        p_to: range.to.toISOString(),
      });
      if (error) throw error;
      return data as ShopAnalytics;
    },
  });
}

export function useCustomerLoyalty(customerId: string) {
  return useQuery({
    queryKey: qk.loyalty(customerId),
    enabled: !!customerId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('customer_loyalty')
        .select('completed_count')
        .eq('customer_id', customerId)
        .maybeSingle();
      if (error) throw error;
      return (data as { completed_count: number } | null)?.completed_count ?? 0;
    },
  });
}
