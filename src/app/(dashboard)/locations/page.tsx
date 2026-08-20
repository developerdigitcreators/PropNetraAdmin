'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { locationService, type LocationImportResult } from '@/services/location.service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, Search, MapPin, Upload, Download, FileSpreadsheet, X } from 'lucide-react';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { withCount } from '@/lib/filter-label';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';

type Level = 'states' | 'cities' | 'micro_markets' | 'locations';

type NavSelection = {
  stateId: string;
  stateName: string;
  cityId: string;
  cityName: string;
  mmId: string;
  mmName: string;
};

const emptyNav: NavSelection = {
  stateId: '',
  stateName: '',
  cityId: '',
  cityName: '',
  mmId: '',
  mmName: '',
};

function isApproved(status?: string) {
  return status === 'approved' || status === 'admin_added';
}

// -------------------------------------------------------
// Generic delete confirmation modal
// -------------------------------------------------------
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

// -------------------------------------------------------
// STATES
// -------------------------------------------------------
function StatesView({
  refreshKey,
  onDrill,
  onStatesChange,
}: {
  refreshKey: number;
  onDrill: (item: { id: string; name: string }) => void;
  onStatesChange: (states: any[]) => void;
}) {
  const { permissions } = useAuthStore();
  const [states, setStates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', is_active: true });

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const s = await locationService.getStates();
      const list = Array.isArray(s) ? s : [];
      setStates(list);
      onStatesChange(list);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, [onStatesChange]);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, is_active: item.is_active ?? true } : { name: '', is_active: true });
    setIsModalOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    setIsSubmitting(true);
    try {
      if (editing) await locationService.updateState(editing.id, form);
      else await locationService.createState(form);
      setIsModalOpen(false); fetch();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const del = async (remark: string) => {
    setIsSubmitting(true);
    try { await locationService.deleteState(editing.id, remark); setIsDeleteOpen(false); fetch(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');
  const filtered = states.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search states..." className="pl-9" />
        </div>
        {canWrite && (
          <Button onClick={() => open()} className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add State
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">State Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={3} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">No states found.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <button
                      type="button"
                      onClick={() => onDrill({ id: item.id, name: item.name })}
                      className="inline-flex items-center gap-2 hover:text-primary transition-colors text-left"
                    >
                      <MapPin className="w-4 h-4 text-primary/60" /> {item.name}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {item.is_active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canWrite && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); open(item); }}><Edit2 className="w-4 h-4 text-gray-500" /></Button>}
                      {permissions.has('locations:delete') && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(item); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} State</DialogTitle><DialogDescription>Configure state details.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">State Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Haryana" /></div>
            <div className="flex items-center justify-between pt-2"><label className="text-sm font-medium">Active</label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={isSubmitting || !form.name}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={del} name={editing?.name} isSubmitting={isSubmitting} />
    </div>
  );
}

// -------------------------------------------------------
// CITIES
// -------------------------------------------------------
function CitiesView({
  refreshKey,
  stateId,
  stateName,
  onDrill,
}: {
  refreshKey: number;
  stateId: string;
  stateName: string;
  onDrill: (item: { id: string; name: string }) => void;
}) {
  const { permissions } = useAuthStore();
  const [cities, setCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', state_id: stateId, is_active: true });

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const c = await locationService.getCities();
      setCities(Array.isArray(c) ? c : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);
  useEffect(() => { setSearch(''); }, [stateId]);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item
      ? { name: item.name, state_id: item.state_id || item.state?.id || stateId, is_active: item.is_active ?? true }
      : { name: '', state_id: stateId, is_active: true });
    setIsModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.state_id) return;
    setIsSubmitting(true);
    try {
      if (editing) await locationService.updateCity(editing.id, form);
      else await locationService.createCity(form);
      setIsModalOpen(false); fetch();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const del = async (remark: string) => {
    setIsSubmitting(true);
    try { await locationService.deleteCity(editing.id, remark); setIsDeleteOpen(false); fetch(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');
  const filtered = cities.filter(c => {
    const matchState = c.state_id === stateId || c.state?.id === stateId;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchState && matchSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cities..." className="pl-9" />
        </div>
        {canWrite && (
          <Button onClick={() => open()} className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add City
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">City Name</th>
              <th className="px-6 py-4 font-semibold text-gray-700">State</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No cities found.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <button
                      type="button"
                      onClick={() => onDrill({ id: item.id, name: item.name })}
                      className="inline-flex items-center gap-2 hover:text-primary transition-colors text-left"
                    >
                      <MapPin className="w-4 h-4 text-primary/60" /> {item.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{item.state?.name || stateName || 'â€”'}</td>
                  <td className="px-6 py-4">
                    {item.is_active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canWrite && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); open(item); }}><Edit2 className="w-4 h-4 text-gray-500" /></Button>}
                      {permissions.has('locations:delete') && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(item); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} City</DialogTitle><DialogDescription>Configure city details.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">City Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Gurugram" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Input value={stateName} disabled className="bg-gray-50" />
            </div>
            <div className="flex items-center justify-between pt-2"><label className="text-sm font-medium">Active</label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={isSubmitting || !form.name || !form.state_id}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={del} name={editing?.name} isSubmitting={isSubmitting} />
    </div>
  );
}

// -------------------------------------------------------
// MICRO MARKETS
// -------------------------------------------------------
function MicroMarketsView({
  refreshKey,
  cityId,
  cityName,
  onDrill,
}: {
  refreshKey: number;
  cityId: string;
  cityName: string;
  onDrill: (item: { id: string; name: string }) => void;
}) {
  const { permissions } = useAuthStore();
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', city_id: cityId, is_active: true });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const mm = await locationService.getMicroMarkets();
      setMicroMarkets(Array.isArray(mm) ? mm : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);
  useEffect(() => { setSearch(''); }, [cityId]);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item
      ? { name: item.name, city_id: item.city_id || item.city?.id || cityId, is_active: item.is_active ?? true }
      : { name: '', city_id: cityId, is_active: true });
    setIsModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.city_id) return;
    setIsSubmitting(true);
    try {
      if (editing) await locationService.updateMicroMarket(editing.id, form);
      else await locationService.createMicroMarket(form);
      setIsModalOpen(false); fetchAll();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const del = async (remark: string) => {
    setIsSubmitting(true);
    try { await locationService.deleteMicroMarket(editing.id, remark); setIsDeleteOpen(false); fetchAll(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');
  const filtered = microMarkets.filter(m => {
    const matchCity = m.city_id === cityId || m.city?.id === cityId;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search micro markets..." className="pl-9" />
        </div>
        {canWrite && (
          <Button onClick={() => open()} className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Micro Market
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Micro Market</th>
              <th className="px-6 py-4 font-semibold text-gray-700">City</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Source</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No micro markets found.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <button
                      type="button"
                      onClick={() => onDrill({ id: item.id, name: item.name })}
                      className="hover:text-primary transition-colors text-left"
                    >
                      {item.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{item.city?.name || cityName || 'â€”'}</td>
                  <td className="px-6 py-4">
                    {item.created_by_admin ? <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Admin</Badge> : <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">User</Badge>}
                  </td>
                  <td className="px-6 py-4">
                    {isApproved(item.status) ? <Badge className="bg-green-100 text-green-700">Approved</Badge> : item.status === 'pending_review' ? <Badge className="bg-orange-100 text-orange-700">Pending</Badge> : <Badge variant="outline" className="text-red-500">Rejected</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canWrite && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); open(item); }}><Edit2 className="w-4 h-4 text-gray-500" /></Button>}
                      {permissions.has('locations:delete') && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(item); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Micro Market</DialogTitle><DialogDescription>Configure micro market details.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Micro Market Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Golf Course Road" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Input value={cityName} disabled className="bg-gray-50" />
            </div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Active</label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={isSubmitting || !form.name || !form.city_id}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={del} name={editing?.name} isSubmitting={isSubmitting} />
    </div>
  );
}

// -------------------------------------------------------
// LOCATIONS
// -------------------------------------------------------
function LocationsView({
  refreshKey,
  cityId,
  cityName,
  mmId,
  mmName,
}: {
  refreshKey: number;
  cityId: string;
  cityName: string;
  mmId: string;
  mmName: string;
}) {
  const { permissions } = useAuthStore();
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', city_id: cityId, micro_market_id: mmId, is_active: true });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const locs = await locationService.getLocations();
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);
  useEffect(() => { setSearch(''); }, [mmId]);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item
      ? {
          name: item.name,
          city_id: item.city_id || item.city?.id || cityId,
          micro_market_id: item.micro_market_id || item.micro_market?.id || mmId,
          is_active: item.is_active ?? true,
        }
      : { name: '', city_id: cityId, micro_market_id: mmId, is_active: true });
    setIsModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.city_id || !form.micro_market_id) return;
    setIsSubmitting(true);
    try {
      if (editing) await locationService.updateLocation(editing.id, form);
      else await locationService.createLocation(form);
      setIsModalOpen(false); fetchAll();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const del = async (remark: string) => {
    setIsSubmitting(true);
    try { await locationService.deleteLocation(editing.id, remark); setIsDeleteOpen(false); fetchAll(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');

  const filtered = locations.filter(l => {
    const matchMM = l.micro_market_id === mmId || l.micro_market?.id === mmId;
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase());
    return isApproved(l.status) && matchMM && matchSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search locations..." className="pl-9" />
        </div>
        {canWrite && (
          <Button onClick={() => open()} className="bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Location
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Location</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Micro Market</th>
              <th className="px-6 py-4 font-semibold text-gray-700">City</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No locations found.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500">{item.micro_market?.name || mmName || 'â€”'}</td>
                  <td className="px-6 py-4 text-gray-500">{item.city?.name || cityName || 'â€”'}</td>
                  <td className="px-6 py-4">
                    {isApproved(item.status) ? <Badge className="bg-green-100 text-green-700">Approved</Badge> : item.status === 'pending_review' ? <Badge className="bg-orange-100 text-orange-700">Pending</Badge> : <Badge variant="outline" className="text-red-500">Rejected</Badge>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canWrite && <Button variant="ghost" size="sm" onClick={() => open(item)}><Edit2 className="w-4 h-4 text-gray-500" /></Button>}
                      {permissions.has('locations:delete') && <Button variant="ghost" size="sm" onClick={() => { setEditing(item); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Location</DialogTitle><DialogDescription>Locations are specific areas within a micro market.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Location Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Sector 65" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Input value={cityName} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Micro Market</label>
              <Input value={mmName} disabled className="bg-gray-50" />
            </div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Geo Location <span className="text-gray-400 font-normal text-xs">(Placeholder)</span></label><Switch checked={false} disabled /></div>
            <div className="flex items-center justify-between"><label className="text-sm font-medium">Active</label><Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={isSubmitting || !form.name || !form.city_id || !form.micro_market_id}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={del} name={editing?.name} isSubmitting={isSubmitting} />
    </div>
  );
}

// -------------------------------------------------------
// EXCEL IMPORT MODAL
// -------------------------------------------------------
const ACCEPTED_EXCEL = '.xlsx,.xls,.csv';
const MAX_FILE_MB = 10;

function ImportExcelModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LocationImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setError('');
    setResult(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResult(null);
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Only .xlsx, .xls, or .csv files are allowed.');
      setFile(null);
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB}MB.`);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);
    setError('');
    try {
      locationService.downloadImportTemplate();
    } catch (e) {
      console.error(e);
      setError('Failed to download template. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await locationService.importExcel(file);
      setResult(res);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || 'Import failed. Please check the file and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Locations from Excel</DialogTitle>
          <DialogDescription>
            Upload a sheet to auto-create State → City → Micro Market → Location .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-900">Required columns</p>
            <div className="flex flex-wrap gap-1.5">
              {['State', 'City', 'Micro Market', 'Location'].map((col) => (
                <Badge key={col} variant="outline" className="bg-white text-gray-700">{col}</Badge>
              ))}
              <Badge variant="outline" className="bg-white text-gray-500">Property Name (optional)</Badge>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={isDownloading} className="w-full sm:w-auto">
              {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download sample template
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Excel / CSV file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXCEL}
              className="hidden"
              onChange={onFileChange}
            />
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary-light/30 transition-colors px-4 py-8 flex flex-col items-center gap-2 text-center"
              >
                <FileSpreadsheet className="w-8 h-8 text-primary/70" />
                <span className="text-sm font-medium text-gray-800">Click to select file</span>
                <span className="text-xs text-gray-500">.xlsx, .xls, or .csv Â· max {MAX_FILE_MB}MB</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="rounded-xl border border-green-100 bg-green-50/60 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Import complete</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white border border-gray-100 px-2 py-2">
                  <p className="text-lg font-semibold text-gray-900">{result.totalRows}</p>
                  <p className="text-[11px] text-gray-500">Total rows</p>
                </div>
                <div className="rounded-lg bg-white border border-gray-100 px-2 py-2">
                  <p className="text-lg font-semibold text-green-700">{result.processed}</p>
                  <p className="text-[11px] text-gray-500">Processed</p>
                </div>
                <div className="rounded-lg bg-white border border-gray-100 px-2 py-2">
                  <p className="text-lg font-semibold text-orange-600">{result.skipped}</p>
                  <p className="text-[11px] text-gray-500">Skipped</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge className="bg-white text-gray-700 border border-gray-200">States +{result.created.states}</Badge>
                <Badge className="bg-white text-gray-700 border border-gray-200">Cities +{result.created.cities}</Badge>
                <Badge className="bg-white text-gray-700 border border-gray-200">Micro Markets +{result.created.microMarkets}</Badge>
                <Badge className="bg-white text-gray-700 border border-gray-200">Locations +{result.created.locations}</Badge>
                <Badge className="bg-white text-gray-700 border border-gray-200">Property Names +{result.created.propertyNames}</Badge>
              </div>
              {result.errors?.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700">Row errors ({result.errors.length})</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">Row {err.row}: {err.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button onClick={upload} disabled={!file || isUploading} className="bg-primary text-white hover:bg-primary/90">
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload & Import
            </Button>
          )}
          {result && (
            <Button onClick={() => { reset(); fileInputRef.current?.click(); }} variant="outline">
              Import another
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------
// MAIN PAGE
// -------------------------------------------------------
export default function LocationManagementPage() {
  const { permissions } = useAuthStore();
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [level, setLevel] = useState<Level>('states');
  const [nav, setNav] = useState<NavSelection>(emptyNav);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');

  useEffect(() => {
    Promise.all([
      locationService.getStates(),
      locationService.getCities(),
      locationService.getMicroMarkets(),
    ])
      .then(([s, c, mm]) => {
        setStates(Array.isArray(s) ? s : []);
        setCities(Array.isArray(c) ? c : []);
        setMicroMarkets(Array.isArray(mm) ? mm : []);
      })
      .catch(console.error);
  }, [refreshKey]);

  const citiesForState = useMemo(
    () =>
      cities.filter(
        (c) => c.state_id === nav.stateId || c.state?.id === nav.stateId,
      ),
    [cities, nav.stateId],
  );

  const microMarketsForCity = useMemo(
    () =>
      microMarkets.filter(
        (m) => m.city_id === nav.cityId || m.city?.id === nav.cityId,
      ),
    [microMarkets, nav.cityId],
  );

  const cityCountByState = useCallback(
    (stateId: string) =>
      cities.filter((c) => c.state_id === stateId || c.state?.id === stateId).length,
    [cities],
  );

  const mmCountByCity = useCallback(
    (cityId: string) =>
      microMarkets.filter((m) => m.city_id === cityId || m.city?.id === cityId).length,
    [microMarkets],
  );

  const resetToStates = () => {
    setLevel('states');
    setNav(emptyNav);
  };

  const goToCities = (stateId: string, stateName: string) => {
    setNav({
      ...emptyNav,
      stateId,
      stateName,
    });
    setLevel('cities');
  };

  const goToMicroMarkets = (cityId: string, cityName: string) => {
    setNav((n) => ({
      ...n,
      cityId,
      cityName,
      mmId: '',
      mmName: '',
    }));
    setLevel('micro_markets');
  };

  const goToLocations = (mmId: string, mmName: string) => {
    setNav((n) => ({ ...n, mmId, mmName }));
    setLevel('locations');
  };

  const onStateDropdownChange = (stateId: string) => {
    if (!stateId) {
      resetToStates();
      return;
    }
    const state = states.find((s) => s.id === stateId);
    goToCities(stateId, state?.name || '');
  };

  const onCityDropdownChange = (cityId: string) => {
    if (!cityId) {
      goToCities(nav.stateId, nav.stateName);
      return;
    }
    const city = citiesForState.find((c) => c.id === cityId);
    goToMicroMarkets(cityId, city?.name || '');
  };

  const onMmDropdownChange = (mmId: string) => {
    if (!mmId) {
      goToMicroMarkets(nav.cityId, nav.cityName);
      return;
    }
    const mm = microMarketsForCity.find((m) => m.id === mmId);
    goToLocations(mmId, mm?.name || '');
  };

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; onClick?: () => void }[] = [];

    if (level === 'states') {
      items.push({ label: 'Location Management' });
      return items;
    }

    items.push({ label: 'Location Management', onClick: resetToStates });

    if (nav.stateName) {
      const isCurrent = level === 'cities';
      items.push(
        isCurrent
          ? { label: nav.stateName }
          : {
              label: nav.stateName,
              onClick: () => goToCities(nav.stateId, nav.stateName),
            },
      );
    }

    if (nav.cityName && (level === 'micro_markets' || level === 'locations')) {
      const isCurrent = level === 'micro_markets';
      items.push(
        isCurrent
          ? { label: nav.cityName }
          : {
              label: nav.cityName,
              onClick: () => goToMicroMarkets(nav.cityId, nav.cityName),
            },
      );
    }

    if (nav.mmName && level === 'locations') {
      items.push({ label: nav.mmName });
    }

    return items;
  }, [level, nav]);

  const levelTitle =
    level === 'states'
      ? 'States'
      : level === 'cities'
        ? 'Cities'
        : level === 'micro_markets'
          ? 'Micro Markets'
          : 'Locations';

  const downloadTemplate = () => {
    try {
      locationService.downloadImportTemplate();
    } catch (e) {
      console.error(e);
      alert('Failed to download template.');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Location Management</h1>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" /> Sample Excel
            </Button>
            <Button onClick={() => setImportOpen(true)} className="bg-primary text-white hover:bg-primary/90">
              <Upload className="w-4 h-4 mr-2" /> Import Excel
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
          <MapPin className="w-4 h-4 text-primary" />
          Browse
        </div>

        <Select value={nav.stateId || undefined} onValueChange={(v) => onStateDropdownChange(v ?? '')}>
          <SelectTrigger className="w-52 bg-white">
            <span>
              {nav.stateName
                ? withCount(nav.stateName, cityCountByState(nav.stateId))
                : 'Select state'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {withCount(s.name, cityCountByState(s.id))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {nav.stateId ? (
          <Select value={nav.cityId || undefined} onValueChange={(v) => onCityDropdownChange(v ?? '')}>
            <SelectTrigger className="w-52 bg-white">
              <span>
                {nav.cityName
                  ? withCount(nav.cityName, mmCountByCity(nav.cityId))
                  : 'Select city'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {citiesForState.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {withCount(c.name, mmCountByCity(c.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {nav.cityId ? (
          <Select value={nav.mmId || undefined} onValueChange={(v) => onMmDropdownChange(v ?? '')}>
            <SelectTrigger className="w-52 bg-white">
              <span>{nav.mmName || 'Select micro market'}</span>
            </SelectTrigger>
            <SelectContent>
              {microMarketsForCity.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <span className="text-sm text-gray-500 ml-auto">{levelTitle}</span>
      </div>

      {level === 'states' && (
        <StatesView
          refreshKey={refreshKey}
          onStatesChange={setStates}
          onDrill={(item) => goToCities(item.id, item.name)}
        />
      )}
      {level === 'cities' && nav.stateId && (
        <CitiesView
          refreshKey={refreshKey}
          stateId={nav.stateId}
          stateName={nav.stateName}
          onDrill={(item) => goToMicroMarkets(item.id, item.name)}
        />
      )}
      {level === 'micro_markets' && nav.cityId && (
        <MicroMarketsView
          refreshKey={refreshKey}
          cityId={nav.cityId}
          cityName={nav.cityName}
          onDrill={(item) => goToLocations(item.id, item.name)}
        />
      )}
      {level === 'locations' && nav.mmId && (
        <LocationsView
          refreshKey={refreshKey}
          cityId={nav.cityId}
          cityName={nav.cityName}
          mmId={nav.mmId}
          mmName={nav.mmName}
        />
      )}

      <ImportExcelModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
