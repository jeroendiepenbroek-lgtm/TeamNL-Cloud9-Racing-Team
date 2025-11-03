import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { Rider } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook: useTopRiders - Real-time top riders ranked by W/kg
 * Replaces Firebase onSnapshot met Supabase real-time subscriptions
 */
export function useTopRiders(limitCount = 20) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    // Initial fetch
    const fetchRiders = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('riders')
          .select('*')
          .order('w_per_kg', { ascending: false, nullsFirst: false })
          .limit(limitCount);

        if (fetchError) {
          console.error('Supabase fetch error:', fetchError);
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        setRiders(data || []);
        setLoading(false);
      } catch (err: any) {
        console.error('Fetch riders error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchRiders();

    // Real-time subscription (updates live!)
    channel = supabase
      .channel('riders_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'riders',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Re-fetch on any change (simple approach)
          fetchRiders();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [limitCount]);

  return { riders, loading, error };
}

/**
 * Hook: useRider - Single rider by Zwift ID
 */
export function useRider(zwiftId: number) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchRider = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('riders')
          .select('*')
          .eq('zwift_id', zwiftId)
          .single();

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        setRider(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchRider();

    // Real-time updates voor deze rider
    channel = supabase
      .channel(`rider_${zwiftId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'riders',
          filter: `zwift_id=eq.${zwiftId}`,
        },
        () => {
          fetchRider();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [zwiftId]);

  return { rider, loading, error };
}

/**
 * Hook: useClubRiders - All riders in a club
 */
export function useClubRiders(clubId: number) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubRiders = async () => {
      try {
        // Join club_roster → riders
        const { data, error: fetchError } = await supabase
          .from('club_roster')
          .select(`
            rider_id,
            riders (*)
          `)
          .eq('club_id', clubId);

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        // Extract riders from joined data
        const riderList = data?.map((item: any) => item.riders).filter(Boolean) || [];
        setRiders(riderList);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchClubRiders();
  }, [clubId]);

  return { riders, loading, error };
}

/**
 * Hook: useRiderHistory - Time-series data for trend analysis
 */
export function useRiderHistory(zwiftId: number, days: number = 90) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Get rider id from zwift_id
        const { data: riderData } = await supabase
          .from('riders')
          .select('id')
          .eq('zwift_id', zwiftId)
          .single();

        if (!riderData) {
          setLoading(false);
          return;
        }

        // Fetch history
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data: historyData } = await supabase
          .from('rider_history')
          .select('*')
          .eq('rider_id', riderData.id)
          .gte('snapshot_date', cutoffDate.toISOString())
          .order('snapshot_date', { ascending: true });

        setHistory(historyData || []);
        setLoading(false);
      } catch (err) {
        console.error('Fetch history error:', err);
        setLoading(false);
      }
    };

    fetchHistory();
  }, [zwiftId, days]);

  return { history, loading };
}

/**
 * Hook: useEventResults - Race results for an event
 */
export function useEventResults(eventId: number) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { data } = await supabase
          .from('race_results')
          .select(`
            *,
            riders (
              zwift_id,
              name,
              category_racing
            )
          `)
          .eq('event_id', eventId)
          .order('position', { ascending: true });

        setResults(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Fetch results error:', err);
        setLoading(false);
      }
    };

    fetchResults();
  }, [eventId]);

  return { results, loading };
}
