'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { locationService } from '@/services/location.service';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { withCount } from '@/lib/filter-label';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';

function isApproved(status?: string) {
  return status === 'approved' || status === 'admin_added';
}

function DeleteModal({ isOpen, onClose, onConfirm, name, isSubmitting }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remark: string) => void;
  name?: string;
  isSubmitting?: boolean;
}) {
  return (
    <DeleteRemarkDialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={name ? `Delete "${name}"?` : 'Delete?'}
      itemName={name}
      submitting={isSubmitting}
      onConfirm={onConfirm}
    />
  );
}

export default function PropertyNamesPage() {
  const { permissions } = useAuthStore();
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [propertyNames, setPropertyNames] = useState<any[]>([]);
  const [filterCityId, setFilterCityId] = useState('');
  const [filterMmId, setFilterMmId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    state_id: '',
    city_id: '',
    micro_market_id: '',
    location_ids: [] as string[],
  });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, c, mm, locs, pns] = await Promise.all([
        locationService.getStates(),
        locationService.getCities(),
        locationService.getMicroMarkets(),
        locationService.getLocations(),
        locationService.getPropertyNames(),
      ]);
      setStates(Array.isArray(s) ? s : []);
      setCities(Array.isArray(c) ? c : []);
      setMicroMarkets(Array.isArray(mm) ? mm : []);
      setLocations(Array.isArray(locs) ? locs : []);
      setPropertyNames(Array.isArray(pns) ? pns : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const formCities = cities.filter(
    (c) => !form.state_id || c.state_id === form.state_id || c.state?.id === form.state_id,
  );
  const formMMs = microMarkets.filter((m) => m.city_id === form.city_id || m.city?.id === form.city_id);
  const formLocs = locations.filter(
    (l) =>
      isApproved(l.status) &&
      (l.micro_market_id === form.micro_market_id || l.micro_market?.id === form.micro_market_id),
  );
  const availableMMs = microMarkets.filter(
    (m) => !filterCityId || m.city_id === filterCityId || m.city?.id === filterCityId,
  );

  const resolveStateId = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    return city?.state_id || city?.state?.id || '';
  };

  const open = (item: any = null) => {
    setEditing(item);
    if (item) {
      const cityId = item.city_id || item.city?.id || '';
      setForm({
        name: item.name,
        state_id: resolveStateId(cityId),
        city_id: cityId,
        micro_market_id: item.micro_market_id || item.micro_market?.id || '',
        location_ids: (item.locations || []).map((l: any) => l.id),
      });
    } else {
      const cityId = filterCityId;
      setForm({
        name: '',
        state_id: cityId ? resolveStateId(cityId) : '',
        city_id: cityId,
        micro_market_id: filterMmId,
        location_ids: [],
      });
    }
    setIsModalOpen(true);
  };

  const toggleLocation = (id: string) => {
    setForm((f) => ({
      ...f,
      location_ids: f.location_ids.includes(id)
        ? f.location_ids.filter((l) => l !== id)
        : [...f.location_ids, id],
    }));
  };

  const save = async () => {
    if (!form.name || !form.city_id || !form.micro_market_id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        city_id: form.city_id,
        micro_market_id: form.micro_market_id,
        location_ids: form.location_ids,
      };
      if (editing) await locationService.updatePropertyName(editing.id, payload);
      else await locationService.createPropertyName(payload);
      setIsModalOpen(false);
      fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const del = async (remark: string) => {
    setIsSubmitting(true);
    try {
      await locationService.deletePropertyName(editing.id, remark);
      setIsDeleteOpen(false);
      fetchAll();
    } catch (e) {
      alert('Cannot delete — may have dependent data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canWrite =
    permissions.has('property_names:create') ||
    permissions.has('property_names:update') ||
    permissions.has('ALL:ALL');
  const canDelete = permissions.has('property_names:delete') || permissions.has('ALL:ALL');

  const filtered = propertyNames.filter((p) => {
    if (!isApproved(p.status)) return false;
    const matchCity = !filterCityId || p.city_id === filterCityId || p.city?.id === filterCityId;
    const matchMM = !filterMmId || p.micro_market_id === filterMmId || p.micro_market?.id === filterMmId;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchMM && matchSearch;
  });

  const approvedNames = propertyNames.filter((p) => isApproved(p.status));
  const countByCity = (cityId: string) =>
    approvedNames.filter((p) => p.city_id === cityId || p.city?.id === cityId).length;
  const countByMm = (mmId: string) =>
    approvedNames.filter(
      (p) =>
        (p.micro_market_id === mmId || p.micro_market?.id === mmId) &&
        (!filterCityId || p.city_id === filterCityId || p.city?.id === filterCityId),
    ).length;
  const allCitiesCount = approvedNames.length;
  const allMmCount = filterCityId ? countByCity(filterCityId) : approvedNames.length;

  const selectedStateName = states.find((s) => s.id === form.state_id)?.name;
  const selectedCityName = cities.find((c) => c.id === form.city_id)?.name;
  const selectedMmName = microMarkets.find((m) => m.id === form.micro_market_id)?.name;
  const filterCityName = cities.find((c) => c.id === filterCityId)?.name;
  const filterMmName = microMarkets.find((m) => m.id === filterMmId)?.name;

  return (
    <PermissionGuard
      permission="property_names:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view Project Names.</div>}
    >
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Project Names' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Project Names</h1>
          <p className="text-gray-500 mt-1">Manage approved property / project names and linked locations.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project names..."
              className="pl-9"
            />
          </div>
          <Select
            value={filterCityId}
            onValueChange={(v) => {
              setFilterCityId(v ?? '');
              setFilterMmId('');
            }}
          >
            <SelectTrigger className="w-44">
              <span>
                {filterCityName
                  ? withCount(filterCityName, countByCity(filterCityId))
                  : withCount('All Cities', allCitiesCount)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{withCount('All Cities', allCitiesCount)}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {withCount(c.name, countByCity(c.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMmId} onValueChange={(v) => setFilterMmId(v ?? '')} disabled={!filterCityId}>
            <SelectTrigger className="w-52">
              <span>
                {filterMmName
                  ? withCount(filterMmName, countByMm(filterMmId))
                  : withCount('All Micro Markets', allMmCount)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{withCount('All Micro Markets', allMmCount)}</SelectItem>
              {availableMMs.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {withCount(m.name, countByMm(m.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canWrite && (
            <Button onClick={() => open()} className="bg-primary text-white hover:bg-primary/90 ml-auto">
              <Plus className="w-4 h-4 mr-2" /> Add Property Name
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Property Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Micro Market</th>
                <th className="px-6 py-4 font-semibold text-gray-700">City</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Linked Locations</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No property names found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-500">{item.micro_market?.name || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{item.city?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(item.locations || []).length === 0 ? (
                          <span className="text-gray-400 text-xs">None</span>
                        ) : (
                          (item.locations || []).slice(0, 2).map((l: any) => (
                            <Badge key={l.id} variant="outline" className="text-xs">{l.name}</Badge>
                          ))
                        )}
                        {(item.locations || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(item.locations || []).length - 2} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isApproved(item.status) ? (
                        <Badge className="bg-green-100 text-green-700">Approved</Badge>
                      ) : item.status === 'pending_review' ? (
                        <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500">Rejected</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => open(item)}>
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(item);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit' : 'Add'} Property Name</DialogTitle>
              <DialogDescription>Link property to state → city → micro market → locations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project / Property Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. DLF The Camellias"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Select
                  value={form.state_id}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      state_id: v ?? '',
                      city_id: '',
                      micro_market_id: '',
                      location_ids: [],
                    });
                  }}
                >
                  <SelectTrigger>
                    {selectedStateName ? <span>{selectedStateName}</span> : <SelectValue placeholder="Select State" />}
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Select
                  value={form.city_id}
                  onValueChange={(v) => {
                    const mms = microMarkets.filter((m) => m.city_id === v || m.city?.id === v);
                    setForm({
                      ...form,
                      city_id: v ?? '',
                      micro_market_id: mms.length === 1 ? mms[0].id : '',
                      location_ids: [],
                    });
                  }}
                  disabled={!form.state_id}
                >
                  <SelectTrigger>
                    {selectedCityName ? (
                      <span>{selectedCityName}</span>
                    ) : (
                      <SelectValue placeholder={form.state_id ? 'Select City' : 'Select state first'} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formCities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Micro Market</label>
                <Select
                  value={form.micro_market_id}
                  onValueChange={(v) => setForm({ ...form, micro_market_id: v ?? '', location_ids: [] })}
                  disabled={!form.city_id}
                >
                  <SelectTrigger>
                    {selectedMmName ? (
                      <span>{selectedMmName}</span>
                    ) : (
                      <SelectValue placeholder={form.city_id ? 'Select Micro Market' : 'Select city first'} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {formMMs.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.micro_market_id && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Linked Locations <span className="text-gray-400 font-normal">(select all that apply)</span>
                  </label>
                  {formLocs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No approved locations in this micro market.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {formLocs.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => toggleLocation(loc.id)}
                          className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                            form.location_ids.includes(loc.id)
                              ? 'bg-primary-light border-primary text-primary font-medium'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                onClick={save}
                disabled={isSubmitting || !form.name || !form.city_id || !form.micro_market_id}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={del}
          name={editing?.name}
          isSubmitting={isSubmitting}
        />
      </div>
    </PermissionGuard>
  );
}
