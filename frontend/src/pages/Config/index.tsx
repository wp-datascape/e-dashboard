import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ConfigPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/config/integration', { replace: true }) }, [navigate])
  return null
}
