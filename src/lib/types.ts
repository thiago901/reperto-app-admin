/** Espelha `reperto-backend/src/services/adminStats.ts`. */

export type PlanStatus = 'paid' | 'trial' | 'grandfathered' | 'free';

export interface AdminUser {
  uid: string;
  email: string | null;
  name: string | null;
  createdAt: number | null;
  lastActiveAt: number | null;
  verified: boolean;
  disabled: boolean;
  provider: string;
  plan: PlanStatus;
  planSource: string | null;
  planEndsAt: number | null;
  cancelling: boolean;
  groups: number;
  ownedGroups: number;
}

export interface AdminGroup {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerPlan: PlanStatus;
  members: number;
  musics: number;
  schedules: number;
  upcoming: number;
  stemRuns: number;
  stemCostUsd: number;
  createdAt: number | null;
  lastActivityAt: number | null;
}

export interface AdminStemJob {
  id: string;
  createdAt: number;
  completedAt: number | null;
  status: string;
  groupId: string;
  groupName: string | null;
  musicId: string;
  musicName: string | null;
  email: string | null;
  sourceLabel: string | null;
  sourceDuration: number | null;
  gpuSeconds: number | null;
  costUsd: number | null;
  error: string | null;
}

export interface AdminAlert {
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export interface DayPoint {
  date: string;
  signups: number;
  active: number;
  musics: number;
  schedules: number;
  stems: number;
}

export interface StemsSummary {
  month: string;
  monthRuns: number;
  monthSucceeded: number;
  monthFailed: number;
  monthCostUsd: number;
  totalRuns: number;
  totalCostUsd: number;
  avgGpuSeconds: number;
  avgCostUsd: number;
  running: number;
  limitPerGroup: number | null;
}

export interface MonthPoint {
  month: string;
  runs: number;
  failed: number;
  costUsd: number;
}

export interface TopGroup {
  groupId: string;
  name: string;
  runs: number;
  costUsd: number;
}

export interface Overview {
  generatedAt: number;
  app: { id: string; name: string };
  overview: {
    users: {
      total: number;
      verified: number;
      disabled: number;
      new7: number;
      new30: number;
      active1: number;
      active7: number;
      active30: number;
      returning7: number;
    };
    plans: {
      paid: number;
      trial: number;
      grandfathered: number;
      free: number;
      cancelling: number;
      trialsEnding7: number;
      bySource: Record<string, number>;
    };
    groups: { total: number; withTeam: number; active30: number; avgMembers: number; new30: number };
    content: {
      musics: number;
      musicsNew30: number;
      schedules: number;
      schedulesNew30: number;
      upcomingSchedules: number;
      musicsWithStems: number;
    };
    stems: StemsSummary;
    deletions30: number;
    pushDevices: number;
  };
  daily: DayPoint[];
  stemsByMonth: MonthPoint[];
  topGroupsByStems: TopGroup[];
  alerts: AdminAlert[];
  recentUsers: AdminUser[];
  recentStemJobs: AdminStemJob[];
}

export interface SystemInfo {
  generatedAt: number;
  alerts: AdminAlert[];
  pushDevices: number;
  system: {
    startedAt: number;
    uptimeSec: number;
    node: string;
    memoryMb: number;
    config: {
      stripe: boolean;
      revenueCat: boolean;
      storage: boolean;
      stems: boolean;
      stemsOpenToManagers: boolean;
      stemsAllowEmails: number;
      stemsMonthlyLimit: number | null;
      stemsCostPerSecondUsd: number | null;
      trialDays: number;
      origins: string[];
    };
  };
}
