import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "admissionFavorites";
const FAVORITES_EVENT = "favorites-updated";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { toast } = useToast();

  const loadFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    const handleFavoritesUpdate = () => {
      loadFavorites();
    };

    window.addEventListener(FAVORITES_EVENT, handleFavoritesUpdate);
    window.addEventListener("storage", handleFavoritesUpdate);

    return () => {
      window.removeEventListener(FAVORITES_EVENT, handleFavoritesUpdate);
      window.removeEventListener("storage", handleFavoritesUpdate);
    };
  }, [loadFavorites]);

  const toggleFavorite = useCallback(
    (unitId: string) => {
      if (!unitId) return;

      let current: string[] = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        current = stored ? JSON.parse(stored) : [];
      } catch {
        current = [];
      }

      const isAdding = !current.includes(unitId);
      const next = isAdding ? [...current, unitId] : current.filter((id) => id !== unitId);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error("Failed to save favorites to localStorage", err);
      }

      setFavorites(next);
      window.dispatchEvent(new Event(FAVORITES_EVENT));

      toast({
        title: isAdding ? "পছন্দের তালিকায় যুক্ত হয়েছে" : "পছন্দের তালিকা থেকে সরানো হয়েছে",
      });
    },
    [toast],
  );

  const isFavorite = useCallback(
    (unitId: string) => (unitId ? favorites.includes(unitId) : false),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
