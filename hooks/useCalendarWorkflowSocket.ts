'use client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useSWRConfig } from 'swr';
import { useAuthStore } from '@/stores/authStore';

// One connection in the admin header refreshes both the bell and any open inbox page.
export function useCalendarWorkflowSocket(allowed: boolean) {
  const token = useAuthStore(s => s.accessToken);
  const userId = useAuthStore(s => s.user.userId);
  const session = useAuthStore(s => s.authSessionVersion);
  const { mutate } = useSWRConfig();
  useEffect(() => {
    if (!allowed || userId <= 0) return;
    const refresh = () => {
      void mutate(key => Array.isArray(key)
        && ['calendar-approvals', 'calendar-approval-notifications', 'calendar-approval-capabilities', 'calendar-approval-accounts', 'calendar-approval-detail'].includes(key[0])
        && key[1] === userId && key[2] === session);
    };
    window.addEventListener('lms:calendar-workflow-change', refresh);
    if (!token) return () => { window.removeEventListener('lms:calendar-workflow-change', refresh); };
    const origin = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000';
    const socket = io(`${origin.replace(/\/$/, '')}/calendar-approvals`, {
      auth: { token }, autoConnect: false, forceNew: true,
      transports: ['websocket', 'polling'], reconnection: true, reconnectionDelayMax: 10_000,
    });
    socket.on('calendar-workflow:changed', () => { refresh(); void mutate(key => Array.isArray(key) && key[0]==='schedules' && key[2]===`${userId}:${session}`); });
    // Resync after a disconnect so missed socket signals never leave stale data.
    socket.on('connect', refresh);
    socket.on('connect_error', refresh);
    socket.connect();
    return () => {
      window.removeEventListener('lms:calendar-workflow-change', refresh);
      socket.removeAllListeners(); socket.disconnect();
    };
  }, [allowed, userId, session, token, mutate]);
}
