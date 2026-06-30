"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/api";

export type DashboardCounts = {
  users: number;
  students: number;
  admitted: number;
  roles: number;
  departments: number;
  courses: number;
  classes: number;
  attendance: number;
  examRecords: number;
};

export type DashboardStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  status: string;
  admissionDate: string;
  department: { name: string; code: string };
};

export type DashboardAttendance = {
  id: number;
  class: { name: string; department: { code: string; name: string } };
  date: string;
  shift: string;
  takenBy: { name: string | null };
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  takenAt: string;
};

export type DashboardData = {
  counts: DashboardCounts;
  recentStudents: DashboardStudent[];
  recentAttendance: DashboardAttendance[];
  studentsByStatus: { status: string; count: number }[];
  studentsByDepartment: {
    departmentId: number;
    department: { name: string; code: string } | null;
    count: number;
  }[];
  chartData: {
    revenueByMonth: { month: string; total: number }[];
    admissionsByMonth: { month: string; count: number }[];
    attendanceByMonth: { month: string; count: number }[];
  };
};

type DashboardContextValue = {
  data: DashboardData | null;
  loading: boolean;
  error: boolean;
};

const DashboardContext = createContext<DashboardContextValue>({
  data: null,
  loading: true,
  error: false,
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.isSuperAdmin) {
      setLoading(false);
      return;
    }

    authFetch("/api/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.counts) setData(d as DashboardData);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [authLoading, user?.isSuperAdmin]);

  return (
    <DashboardContext.Provider value={{ data, loading, error }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
