'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { locationService } from '@/services/location.service';
import { listingConfigService } from '@/services/listing-config.service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, AlertTriangle, Search, MapPin, Building2, Navigation, Home } from 'lucide-react';
import { Breadcrumb } from '@/components/common/breadcrumb';

// -------------------------------------------------------
// Generic delete confirmation modal
// -------------------------------------------------------
function DeleteModal({ isOpen, onClose, onConfirm, name, isSubmitting }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader className="hidden"><DialogTitle>Delete</DialogTitle><DialogDescription>Confirm</DialogDescription></DialogHeader>
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete "{name}"?</h3>
          <p className="text-sm text-gray-500 mb-6">This action cannot be undone. Any dependent data may be affected.</p>
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------
// CITIES TAB
// -------------------------------------------------------
function CitiesTab() {
  const { permissions } = useAuthStore();
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', state_id: '', is_active: true });

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { 
      const [s, c] = await Promise.all([locationService.getStates(), locationService.getCities()]);
      setStates(Array.isArray(s) ? s : []);
      setCities(Array.isArray(c) ? c : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, state_id: item.state_id || item.state?.id || '', is_active: item.is_active ?? true } : { name: '', state_id: '', is_active: true });
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

  const del = async () => {
    setIsSubmitting(true);
    try { await locationService.deleteCity(editing.id); setIsDeleteOpen(false); fetch(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');
  const filtered = cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

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
              <tr><td colSpan={3} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-500">No cities found.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/60" /> {item.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{item.state?.name || '—'}</td>
                  <td className="px-6 py-4">
                    {item.is_active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
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
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} City</DialogTitle><DialogDescription>Configure city details.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">City Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Gurugram" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select value={form.state_id} onValueChange={v => setForm({...form, state_id: v})}>
                <SelectTrigger>
                  {form.state_id ? states.find(s => s.id === form.state_id)?.name || 'Unknown' : <SelectValue placeholder="Select State" />}
                </SelectTrigger>
                <SelectContent>
                  {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
// MICRO MARKETS TAB
// -------------------------------------------------------
function MicroMarketsTab() {
  const { permissions } = useAuthStore();
  const [cities, setCities] = useState<any[]>([]);
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const [filterCityId, setFilterCityId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', city_id: '', is_active: true });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, mm] = await Promise.all([locationService.getCities(), locationService.getMicroMarkets()]);
      setCities(c); setMicroMarkets(Array.isArray(mm) ? mm : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, city_id: item.city_id || item.city?.id || '', is_active: item.is_active ?? true } : { name: '', city_id: filterCityId, is_active: true });
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

  const del = async () => {
    setIsSubmitting(true);
    try { await locationService.deleteMicroMarket(editing.id); setIsDeleteOpen(false); fetchAll(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');
  const filtered = microMarkets.filter(m => {
    const matchCity = !filterCityId || m.city_id === filterCityId || m.city?.id === filterCityId;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  const selectedCityName = cities.find(c => c.id === form.city_id)?.name;
  const filterCityName = cities.find(c => c.id === filterCityId)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search micro markets..." className="pl-9" />
        </div>
        <Select value={filterCityId} onValueChange={setFilterCityId}>
          <SelectTrigger className="w-48">
            {filterCityName ? <span>{filterCityName}</span> : <SelectValue placeholder="All Cities" />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Cities</SelectItem>
            {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
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
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500">{item.city?.name || '—'}</td>
                  <td className="px-6 py-4">
                    {item.created_by_admin ? <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Admin</Badge> : <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">User</Badge>}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'approved' || item.status === 'admin_added' ? <Badge className="bg-green-100 text-green-700">Approved</Badge> : item.status === 'pending_review' ? <Badge className="bg-orange-100 text-orange-700">Pending</Badge> : <Badge variant="outline" className="text-red-500">Rejected</Badge>}
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
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Micro Market</DialogTitle><DialogDescription>Configure micro market details.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Micro Market Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Golf Course Road" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Select value={form.city_id} onValueChange={v => setForm({...form, city_id: v})}>
                <SelectTrigger>{selectedCityName ? <span>{selectedCityName}</span> : <SelectValue placeholder="Select City" />}</SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
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
// LOCATIONS TAB
// -------------------------------------------------------
function LocationsTab() {
  const { permissions } = useAuthStore();
  const [cities, setCities] = useState<any[]>([]);
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filterCityId, setFilterCityId] = useState('');
  const [filterMmId, setFilterMmId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', city_id: '', micro_market_id: '', is_active: true });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, mm, locs] = await Promise.all([locationService.getCities(), locationService.getMicroMarkets(), locationService.getLocations()]);
      setCities(c); setMicroMarkets(Array.isArray(mm) ? mm : []); setLocations(Array.isArray(locs) ? locs : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const availableMMs = microMarkets.filter(m => !filterCityId || m.city_id === filterCityId || m.city?.id === filterCityId);
  const formMMs = microMarkets.filter(m => m.city_id === form.city_id || m.city?.id === form.city_id);

  const open = (item: any = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, city_id: item.city_id || item.city?.id || '', micro_market_id: item.micro_market_id || item.micro_market?.id || '', is_active: item.is_active ?? true } : { name: '', city_id: filterCityId, micro_market_id: filterMmId, is_active: true });
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

  const del = async () => {
    setIsSubmitting(true);
    try { await locationService.deleteLocation(editing.id); setIsDeleteOpen(false); fetchAll(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');

  const filtered = locations.filter(l => {
    const matchCity = !filterCityId || l.city_id === filterCityId || l.city?.id === filterCityId;
    const matchMM = !filterMmId || l.micro_market_id === filterMmId || l.micro_market?.id === filterMmId;
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchMM && matchSearch;
  });

  const selectedCityName = cities.find(c => c.id === form.city_id)?.name;
  const selectedMmName = microMarkets.find(m => m.id === form.micro_market_id)?.name;
  const filterCityName = cities.find(c => c.id === filterCityId)?.name;
  const filterMmName = microMarkets.find(m => m.id === filterMmId)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search locations..." className="pl-9" />
        </div>
        <Select value={filterCityId} onValueChange={v => { setFilterCityId(v); setFilterMmId(''); }}>
          <SelectTrigger className="w-40">{filterCityName ? <span>{filterCityName}</span> : <SelectValue placeholder="All Cities" />}</SelectTrigger>
          <SelectContent><SelectItem value="">All Cities</SelectItem>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterMmId} onValueChange={setFilterMmId} disabled={!filterCityId}>
          <SelectTrigger className="w-48">{filterMmName ? <span>{filterMmName}</span> : <SelectValue placeholder="All Micro Markets" />}</SelectTrigger>
          <SelectContent><SelectItem value="">All Micro Markets</SelectItem>{availableMMs.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
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
                  <td className="px-6 py-4 text-gray-500">{item.micro_market?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{item.city?.name || '—'}</td>
                  <td className="px-6 py-4">
                    {item.status === 'approved' || item.status === 'admin_added' ? <Badge className="bg-green-100 text-green-700">Approved</Badge> : item.status === 'pending_review' ? <Badge className="bg-orange-100 text-orange-700">Pending</Badge> : <Badge variant="outline" className="text-red-500">Rejected</Badge>}
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
              <Select value={form.city_id} onValueChange={v => {
                const mms = microMarkets.filter(m => m.city_id === v || m.city?.id === v);
                setForm({...form, city_id: v, micro_market_id: mms.length === 1 ? mms[0].id : ''});
              }}>
                <SelectTrigger>{selectedCityName ? <span>{selectedCityName}</span> : <SelectValue placeholder="Select City first" />}</SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Micro Market</label>
              <Select value={form.micro_market_id} onValueChange={v => setForm({...form, micro_market_id: v})} disabled={!form.city_id}>
                <SelectTrigger>{selectedMmName ? <span>{selectedMmName}</span> : <SelectValue placeholder={form.city_id ? 'Select Micro Market' : 'Select city first'} />}</SelectTrigger>
                <SelectContent>{formMMs.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
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
// PROPERTY NAMES TAB
// -------------------------------------------------------
function PropertyNamesTab() {
  const { permissions } = useAuthStore();
  const [cities, setCities] = useState<any[]>([]);
  const [microMarkets, setMicroMarkets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [propertyNames, setPropertyNames] = useState<any[]>([]);
  const [filterCityId, setFilterCityId] = useState('');
  const [filterMmId, setFilterMmId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', city_id: '', micro_market_id: '', location_ids: [] as string[] });

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, mm, locs, cats, pns] = await Promise.all([
        locationService.getCities(), locationService.getMicroMarkets(), locationService.getLocations(),
        listingConfigService.getCategories(), locationService.getPropertyNames()
      ]);
      setCities(c); setMicroMarkets(Array.isArray(mm) ? mm : []); setLocations(Array.isArray(locs) ? locs : []);
      setCategories(Array.isArray(cats) ? cats : []); setPropertyNames(Array.isArray(pns) ? pns : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const formMMs = microMarkets.filter(m => m.city_id === form.city_id || m.city?.id === form.city_id);
  const formLocs = locations.filter(l => l.micro_market_id === form.micro_market_id || l.micro_market?.id === form.micro_market_id);
  const availableMMs = microMarkets.filter(m => !filterCityId || m.city_id === filterCityId || m.city?.id === filterCityId);

  const open = (item: any = null) => {
    setEditing(item);
    if (item) {
      setForm({
        name: item.name,
        city_id: item.city_id || item.city?.id || '',
        micro_market_id: item.micro_market_id || item.micro_market?.id || '',
        location_ids: (item.locations || []).map((l: any) => l.id),
      });
    } else {
      setForm({ name: '', city_id: filterCityId, micro_market_id: filterMmId, location_ids: [] });
    }
    setIsModalOpen(true);
  };

  const toggleLocation = (id: string) => {
    setForm(f => ({ ...f, location_ids: f.location_ids.includes(id) ? f.location_ids.filter(l => l !== id) : [...f.location_ids, id] }));
  };

  const save = async () => {
    if (!form.name || !form.city_id || !form.micro_market_id) return;
    setIsSubmitting(true);
    try {
      if (editing) await locationService.updatePropertyName(editing.id, form);
      else await locationService.createPropertyName(form);
      setIsModalOpen(false); fetchAll();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const del = async () => {
    setIsSubmitting(true);
    try { await locationService.deletePropertyName(editing.id); setIsDeleteOpen(false); fetchAll(); }
    catch (e) { alert('Cannot delete — may have dependent data.'); }
    finally { setIsSubmitting(false); }
  };

  const canWrite = permissions.has('locations:create') || permissions.has('locations:update');

  const filtered = propertyNames.filter(p => {
    const matchCity = !filterCityId || p.city_id === filterCityId || p.city?.id === filterCityId;
    const matchMM = !filterMmId || p.micro_market_id === filterMmId || p.micro_market?.id === filterMmId;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchMM && matchSearch;
  });

  const selectedCityName = cities.find(c => c.id === form.city_id)?.name;
  const selectedMmName = microMarkets.find(m => m.id === form.micro_market_id)?.name;
  const filterCityName = cities.find(c => c.id === filterCityId)?.name;
  const filterMmName = microMarkets.find(m => m.id === filterMmId)?.name;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search property names..." className="pl-9" />
        </div>
        <Select value={filterCityId} onValueChange={v => { setFilterCityId(v); setFilterMmId(''); }}>
          <SelectTrigger className="w-36">{filterCityName ? <span>{filterCityName}</span> : <SelectValue placeholder="All Cities" />}</SelectTrigger>
          <SelectContent><SelectItem value="">All Cities</SelectItem>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterMmId} onValueChange={setFilterMmId} disabled={!filterCityId}>
          <SelectTrigger className="w-44">{filterMmName ? <span>{filterMmName}</span> : <SelectValue placeholder="All Micro Markets" />}</SelectTrigger>
          <SelectContent><SelectItem value="">All Micro Markets</SelectItem>{availableMMs.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
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
              <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No property names found.</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500">{item.micro_market?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{item.city?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(item.locations || []).length === 0 ? <span className="text-gray-400 text-xs">None</span> :
                        (item.locations || []).slice(0, 2).map((l: any) => <Badge key={l.id} variant="outline" className="text-xs">{l.name}</Badge>)}
                      {(item.locations || []).length > 2 && <Badge variant="outline" className="text-xs">+{(item.locations || []).length - 2} more</Badge>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'approved' || item.status === 'admin_added' ? <Badge className="bg-green-100 text-green-700">Approved</Badge> : item.status === 'pending_review' ? <Badge className="bg-orange-100 text-orange-700">Pending</Badge> : <Badge variant="outline" className="text-red-500">Rejected</Badge>}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Property Name</DialogTitle><DialogDescription>Link property to city → micro market → locations.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Project / Property Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. DLF The Camellias" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Select value={form.city_id} onValueChange={v => {
                const mms = microMarkets.filter(m => m.city_id === v || m.city?.id === v);
                setForm({...form, city_id: v, micro_market_id: mms.length === 1 ? mms[0].id : '', location_ids: []});
              }}>
                <SelectTrigger>{selectedCityName ? <span>{selectedCityName}</span> : <SelectValue placeholder="Select City" />}</SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Micro Market</label>
              <Select value={form.micro_market_id} onValueChange={v => setForm({...form, micro_market_id: v, location_ids: []})} disabled={!form.city_id}>
                <SelectTrigger>{selectedMmName ? <span>{selectedMmName}</span> : <SelectValue placeholder={form.city_id ? 'Select Micro Market' : 'Select city first'} />}</SelectTrigger>
                <SelectContent>{formMMs.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.micro_market_id && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Linked Locations <span className="text-gray-400 font-normal">(select all that apply)</span></label>
                {formLocs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No locations in this micro market. Add some in the Locations tab first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {formLocs.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${form.location_ids.includes(loc.id) ? 'bg-primary-light border-primary text-primary font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
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
            <Button onClick={save} disabled={isSubmitting || !form.name || !form.city_id || !form.micro_market_id}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={del} name={editing?.name} isSubmitting={isSubmitting} />
    </div>
  );
}

// -------------------------------------------------------
// MAIN PAGE
// -------------------------------------------------------
export default function LocationManagementPage() {
  return (
    <div className="space-y-6 pb-24">
      <Breadcrumb items={[{ label: 'Location Management' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Location Management</h1>
        <p className="text-gray-500 mt-1">Manage the City → Micro Market → Location → Property Name hierarchy.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Cities', icon: MapPin, color: 'bg-blue-50 text-blue-600' },
          { label: 'Micro Markets', icon: Building2, color: 'bg-purple-50 text-purple-600' },
          { label: 'Locations', icon: Navigation, color: 'bg-green-50 text-green-600' },
          { label: 'Property Names', icon: Home, color: 'bg-orange-50 text-orange-600' },
        ].map(({ label, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            <span className="font-medium text-gray-700 text-sm">{label}</span>
          </div>
        ))}
      </div>

      <Tabs defaultValue="cities" className="w-full">
        <TabsList className="bg-white border shadow-sm p-1">
          <TabsTrigger value="cities" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-5">
            <MapPin className="w-4 h-4 mr-2" /> Cities
          </TabsTrigger>
          <TabsTrigger value="micro_markets" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-5">
            <Building2 className="w-4 h-4 mr-2" /> Micro Markets
          </TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-5">
            <Navigation className="w-4 h-4 mr-2" /> Locations
          </TabsTrigger>
          <TabsTrigger value="property_names" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-5">
            <Home className="w-4 h-4 mr-2" /> Property Names
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cities" className="mt-6"><CitiesTab /></TabsContent>
        <TabsContent value="micro_markets" className="mt-6"><MicroMarketsTab /></TabsContent>
        <TabsContent value="locations" className="mt-6"><LocationsTab /></TabsContent>
        <TabsContent value="property_names" className="mt-6"><PropertyNamesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
