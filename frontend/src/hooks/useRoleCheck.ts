import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';

export const useRoleCheck = (tripId: string | undefined) => {
  const { user } = useAuth();
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId || !user) return;
    
    // In a real app, you'd fetch the trip details and check organizer_id
    // For now, we simulate checking
    api.get(`/trips/${tripId}`).then(res => {
      setIsOrganizer(res.data.data.organizer_id === user.id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tripId, user]);

  return { isOrganizer, loading };
};