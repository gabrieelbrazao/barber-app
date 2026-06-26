import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Appointment,
  AppointmentStatus,
  Banner,
  BarberProfile,
  BrandColors,
  Service,
  Shop,
  ShopBranding,
  WorkingHours,
} from '@/lib/database.types';
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
  services: (barberId: string) => ['services', barberId] as const,
  shop: ['shop', SHOP_ID] as const,
  shopBranding: ['shop', 'branding', SHOP_ID] as const,
  banners: ['banners', SHOP_ID] as const,
  myAppointments: (uid: string) => ['appointments', 'customer', uid] as const,
  barberAppointments: (uid: string) => ['appointments', 'barber', uid] as const,
  dayAppointments: (barberId: string, dayISO: string) =>
    ['appointments', 'day', barberId, dayISO] as const,
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

/** This shop's staff (the build is pinned to one shop; RLS also enforces it). */
export function useBarbers() {
  return useQuery({
    queryKey: qk.barbers,
    queryFn: async (): Promise<BarberListItem[]> => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select(BARBER_SELECT)
        .eq('shop_id', SHOP_ID)
        .order('title', { nullsFirst: false });
      if (error) throw error;
      return (data as unknown as BarberRow[]).map(toBarberDetail);
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
// Appointments — reads
// ---------------------------------------------------------------------------

const APPOINTMENT_SELECT =
  'id, start_time, end_time, status, services(name), barber:barber_profiles(profiles!inner(full_name)), customer:profiles!appointments_customer_id_fkey(full_name)';

type AppointmentRow = Pick<Appointment, 'id' | 'start_time' | 'end_time' | 'status'> & {
  services: { name: string } | null;
  barber: { profiles: { full_name: string | null } | null } | null;
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
    }) => {
      const { error } = await supabase.from('appointments').insert({
        customer_id: input.customerId,
        barber_id: input.barberId,
        service_id: input.serviceId,
        shop_id: SHOP_ID,
        start_time: input.start.toISOString(),
        end_time: input.end.toISOString(),
        status: 'pending',
      });
      if (error) {
        // 23P01 = exclusion_violation from the appointments_no_overlap constraint:
        // someone took this slot between loading the picker and confirming.
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
      active?: boolean;
    }) => {
      const payload = {
        barber_id: barberId,
        shop_id: SHOP_ID,
        name: input.name,
        price_cents: input.priceCents,
        duration_minutes: input.durationMinutes,
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
