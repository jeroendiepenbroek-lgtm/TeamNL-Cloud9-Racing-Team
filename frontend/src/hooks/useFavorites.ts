import { useState, useEffect } from 'react'

const FAVORITES_KEY = 'cloudracer_favorite_riders'

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (riderId: number) => {
    setFavorites(prev => 
      prev.includes(riderId) 
        ? prev.filter(id => id !== riderId)
        : [...prev, riderId]
    )
  }

  const isFavorite = (riderId: number) => favorites.includes(riderId)

  return { favorites, toggleFavorite, isFavorite }
}
