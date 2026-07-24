import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { activityLogApi } from '@/api/activityLog.api'

/**
 * Kirim event page-view (Level 1 — Riwayat Menu) ke activity_logs tiap kali
 * route React Router berubah. Dipasang di DashboardLayout (dirender ulang
 * setiap navigasi lewat withLayout() di routeConstants.tsx).
 *
 * Guard via ref: cegah double-fire dari React StrictMode (dev) yang me-mount
 * ulang komponen yang sama tanpa perpindahan path sungguhan.
 */
export function usePageViewTracking() {
  const location = useLocation()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    void activityLogApi.trackPageView(location.pathname)
  }, [location.pathname])
}
