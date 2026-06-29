import { useAuth } from '@/context/auth.context'

export function useCan() {
  const { permissions } = useAuth()
  return (key: string) => permissions.includes(key)
}
