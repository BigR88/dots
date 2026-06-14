import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyProfile, updateMyProfile, type ProfilePatch } from '@/data/profile';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';

/** Eigenes Profil (Name, @username, Bio, Interessen, Bereich) — live aus Supabase. */
export function useMyProfile() {
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  return useQuery({
    queryKey: ['my-profile', uid],
    queryFn: () => fetchMyProfile(uid!),
    enabled: isSupabaseConfigured && Boolean(uid),
    staleTime: 30_000,
  });
}

/** Profil aktualisieren + relevante Caches invalidieren. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateMyProfile(uid ?? '', patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-profile'] });
      // Name/Username erscheinen auch in der Freundesübersicht.
      void qc.invalidateQueries({ queryKey: ['friend-overview'] });
    },
  });
}
