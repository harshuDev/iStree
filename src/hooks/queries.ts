// React Query hooks over the services layer. Keys are scoped by user id so a
// shared device never shows one account's cached data to another.
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserId } from './useAuth';
import * as cyclesApi from '../services/cycles';
import * as logsApi from '../services/dailyLogs';
import * as settingsApi from '../services/settings';
import { effectiveLengths, getCycleContext, type ISODate } from '../lib/cycle';
import { today } from '../lib/dates';
import type { DailyLogInput, UserSettings, UserSettingsUpdate } from '../lib/database.types';

export const keys = {
  settings: (uid: string) => ['settings', uid] as const,
  cycles: (uid: string) => ['cycles', uid] as const,
  logs: (uid: string) => ['daily_logs', uid] as const,
  log: (uid: string, date: ISODate) => ['daily_logs', uid, 'day', date] as const,
  logsFrom: (uid: string, from: ISODate) => ['daily_logs', uid, 'from', from] as const,
};

// --- settings ---------------------------------------------------------------

export function useSettings() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.settings(uid), queryFn: settingsApi.getSettings });
}

export function useUpdateSettings() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UserSettingsUpdate) => settingsApi.updateSettings(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: keys.settings(uid) });
      const previous = qc.getQueryData<UserSettings>(keys.settings(uid));
      if (previous) qc.setQueryData(keys.settings(uid), { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, _patch, ctx) => ctx?.previous && qc.setQueryData(keys.settings(uid), ctx.previous),
    onSuccess: (data) => qc.setQueryData(keys.settings(uid), data),
  });
}

// --- cycles -----------------------------------------------------------------

export function useCycles() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.cycles(uid), queryFn: cyclesApi.listCycles });
}

function useCycleMutation<T>(fn: (arg: T) => Promise<void>) {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: keys.cycles(uid) }) });
}

export function useLogPeriodStart() {
  const { data: cycles = [] } = useCycles();
  const { periodLength } = useCycleState();
  return useCycleMutation((date: ISODate) => cyclesApi.logPeriodStart(date, cycles, periodLength));
}

export function useLogPeriodEnd() {
  const { data: cycles = [] } = useCycles();
  return useCycleMutation((date: ISODate) => cyclesApi.logPeriodEnd(date, cycles));
}

export function useUpdateCycle() {
  return useCycleMutation(({ id, ...patch }: { id: string; start_date?: ISODate; end_date?: ISODate | null }) =>
    cyclesApi.updateCycle(id, patch),
  );
}

export function useDeleteCycle() {
  return useCycleMutation((id: string) => cyclesApi.deleteCycle(id));
}

/** Derived cycle state for today: phase, predictions, effective lengths. */
export function useCycleState() {
  const { data: cycles, isLoading: cyclesLoading } = useCycles();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const date = today();
  return useMemo(() => {
    const s = settings ?? { average_cycle_length: 28, average_period_length: 5, use_computed_averages: true };
    const list = cycles ?? [];
    return {
      loading: cyclesLoading || settingsLoading,
      cycles: list,
      settings,
      today: date,
      context: getCycleContext(list, s, date),
      ...effectiveLengths(list, s),
    };
  }, [cycles, settings, cyclesLoading, settingsLoading, date]);
}

// --- daily logs -------------------------------------------------------------

export function useDailyLog(date: ISODate) {
  const uid = useUserId();
  return useQuery({ queryKey: keys.log(uid, date), queryFn: () => logsApi.getDailyLog(date) });
}

export function useDailyLogs(from: ISODate) {
  const uid = useUserId();
  return useQuery({ queryKey: keys.logsFrom(uid, from), queryFn: () => logsApi.listDailyLogs(from) });
}

export function useSaveDailyLog() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: DailyLogInput) => logsApi.saveDailyLog(log),
    onSuccess: (saved) => {
      qc.setQueryData(keys.log(uid, saved.date), saved);
      void qc.invalidateQueries({ queryKey: keys.logs(uid) });
    },
  });
}
