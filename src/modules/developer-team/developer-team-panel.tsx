'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { TeamMemberFormDialog } from '@/components/developer-home/team-member-form-dialog';
import {
  developerHomeApiError,
  developerHomeService,
  type AdminTeamMember,
  type HomeDeveloperPreview,
} from '@/services/developer-home.service';
import { Loader2, Pencil, Plus, Trash2, UserRound } from 'lucide-react';

const PAGES = [
  { value: 'developer_profile', label: 'Developer profile' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'banner_ads', label: 'Banner ads' },
  { value: 'group_chat', label: 'Group chat' },
] as const;

type DeveloperTeamPanelProps = {
  developer: HomeDeveloperPreview;
};

export function DeveloperTeamPanel({ developer }: DeveloperTeamPanelProps) {
  const { permissions } = useAuthStore();
  const canCreate = permissions.has('developer_team:create');
  const canUpdate = permissions.has('developer_team:update') || canCreate;
  const canDelete = permissions.has('developer_team:delete');

  const [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminTeamMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editMember, setEditMember] = useState<AdminTeamMember | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMembers(await developerHomeService.listTeam(developer.id));
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to load team members.'));
    } finally {
      setLoading(false);
    }
  }, [developer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceMember = (m: AdminTeamMember) =>
    setMembers((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, ...m, microMarkets: m.microMarkets ?? x.microMarkets } : x)),
    );

  const togglePage = async (m: AdminTeamMember, page: string) => {
    const has = m.assignments.some((a) => a.page === page);
    const next = has ? m.assignments.filter((a) => a.page !== page) : [...m.assignments, { page, listingId: null }];
    setBusyId(m.id);
    try {
      replaceMember(await developerHomeService.setAssignments(developer.id, m.id, next));
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to update pages.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (m: AdminTeamMember, isActive: boolean) => {
    setBusyId(m.id);
    try {
      replaceMember(await developerHomeService.updateMember(developer.id, m.id, { isActive }));
    } catch (err) {
      setError(developerHomeApiError(err, 'Failed to update member.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setEditMember(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add team member
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl border divide-y">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No team members yet.</p>
        ) : (
          members.map((m) => {
            const projectCount = m.assignments.filter((a) => a.page === 'property_detail').length;
            return (
              <div key={m.id} className="p-4 flex flex-wrap items-start gap-4">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover border" />
                ) : (
                  <div className="h-12 w-12 rounded-full border bg-gray-50 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-gray-300" />
                  </div>
                )}
                <div className="min-w-[180px] flex-1 space-y-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {m.name}{' '}
                      {!m.isActive && (
                        <Badge variant="outline" className="ml-1 text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[m.phone, m.designation].filter(Boolean).join(' · ')}
                      {projectCount ? ` · ${projectCount} project page${projectCount === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PAGES.map((p) => {
                      const on = m.assignments.some((a) => a.page === p.value);
                      return (
                        <button
                          type="button"
                          key={p.value}
                          disabled={!canUpdate || busyId === m.id}
                          onClick={() => void togglePage(m, p.value)}
                          className={`px-2.5 py-0.5 rounded-full border text-xs ${
                            on ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditMember(m);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Switch
                    checked={m.isActive}
                    disabled={!canUpdate || busyId === m.id}
                    onCheckedChange={(v) => void toggleActive(m, v)}
                  />
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setToDelete(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <TeamMemberFormDialog
        open={formOpen}
        developerId={developer.id}
        member={editMember}
        pages={['developer_profile', 'coming_soon']}
        onClose={() => {
          setFormOpen(false);
          setEditMember(null);
        }}
        onSaved={(member) => {
          if (editMember) replaceMember(member);
          else setMembers((prev) => [...prev, { ...member, microMarkets: member.microMarkets ?? [] }]);
          setFormOpen(false);
          setEditMember(null);
        }}
      />

      <DeleteRemarkDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete team member?"
        itemName={toDelete?.name}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await developerHomeService.deleteMember(developer.id, toDelete.id);
            setMembers((prev) => prev.filter((x) => x.id !== toDelete.id));
            setToDelete(null);
          } catch (err) {
            setToDelete(null);
            setError(developerHomeApiError(err, 'Failed to delete member.'));
          }
        }}
      />
    </div>
  );
}
