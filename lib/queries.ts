import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Appointment,
  AppointmentStatus,
  BarberProfile,
  Service,
  WorkingHours,
} from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// View shapes (flattened from joins for the UI)
// ---------------------------------------------------------------------------

export type BarberListItem = {
  id: string;
  name: string;
  shopName: string | null;
  location: string | null;
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
  myAppointments: (uid: string) => ['appointments', 'customer', uid] as const,
  barberAppointments: (uid: string) => ['appointments', 'barber', uid] as const,
  dayAppointments: (barberId: string, dayISO: string) =>
    ['appointments', 'day', barberId, dayISO] as const,
};

// ---------------------------------------------------------------------------
// Barbers & services
// ---------------------------------------------------------------------------

type BarberRow = Pick<BarberProfile, 'id' | 'shop_name' | 'location' | 'bio' | 'working_hours'> & {
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

function toBarberDetail(row: BarberRow): BarberDetail {
  return {
    id: row.id,
    name: row.profiles?.full_name ?? 'Barber',
    shopName: row.shop_name,
    location: row.location,
    avatarUrl: row.profiles?.avatar_url ?? null,
    bio: row.bio,
    workingHours: row.working_hours,
  };
}

export function useBarbers() {
  return useQuery({
    queryKey: qk.barbers,
    queryFn: async (): Promise<BarberListItem[]> => {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('id, shop_name, location, bio, working_hours, profiles!inner(full_name, avatar_url)')
        .order('shop_name');
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
        .select('id, shop_name, location, bio, working_hours, profiles!inner(full_name, avatar_url)')
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
        start_time: input.start.toISOString(),
        end_time: input.end.toISOString(),
        status: 'pending',
      });
      if (error) {
        // 23P01 = exclusion_violation from the appointments_no_overlap constraint:
        // someone took this slot between loading the picker and confirming.
        if (error.code === '23P01') {
          throw new Error('Esse horário acabou de ser reservado. Escolha outro.');
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
