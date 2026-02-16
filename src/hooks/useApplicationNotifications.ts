import { useState, useEffect } from 'react'

// Mock data for demo mode
export function useApplicationNotifications() {
  const [pendingCount, setPendingCount] = useState(1) // Mock pending count

  useEffect(() => {
    // Simulate real-time updates in demo mode
    const interval = setInterval(() => {
      // Randomly update count for demo purposes
      if (Math.random() > 0.9) {
        setPendingCount(prev => Math.max(0, prev + (Math.random() > 0.5 ? 1 : -1)))
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  return { pendingCount }
}