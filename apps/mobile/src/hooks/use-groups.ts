import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createGroup as persistCreate, readGroups } from '@/lib/groups-store';

/**
 * Reaktiver Zugriff auf die (lokal gespeicherten) Gruppen über React Query –
 * damit Liste, Chat-Kopf und Detailseite denselben Cache teilen und sich nach
 * Änderungen (Name, Bild, Mitglieder …) überall sofort aktualisieren.
 */
export function useGroups() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['groups'], queryFn: readGroups });

  const create = async (name: string, memberIds: string[]) => {
    await persistCreate(name, memberIds);
    await qc.invalidateQueries({ queryKey: ['groups'] });
  };

  return { groups: data ?? [], loading: isLoading, create };
}
