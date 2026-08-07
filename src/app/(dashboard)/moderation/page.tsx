'use client';

import { useEffect, useState } from 'react';
import { moderationService } from '@/services/moderation.service';
import { locationService } from '@/services/location.service';
import { ModerationCard } from '@/modules/locations/moderation-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Inbox, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionGuard } from '@/components/common/permission-guard';

export default function ModerationQueuePage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [propertyNames, setPropertyNames] = useState<any[]>([]);
  const [customOptions, setCustomOptions] = useState<any[]>([]);
  const [pendingMicroMarkets, setPendingMicroMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModerationData = () => {
    setIsLoading(true);
    Promise.all([
      moderationService.getPendingLocations(),
      moderationService.getPendingPropertyNames(),
      moderationService.getPendingOptions(),
      locationService.getPendingMicroMarkets(),
    ])
      .then(([locs, props, opts, mms]) => {
        setLocations(Array.isArray(locs) ? locs : []);
        setPropertyNames(Array.isArray(props) ? props : []);
        setCustomOptions(Array.isArray(opts) ? opts : []);
        setPendingMicroMarkets(Array.isArray(mms) ? mms : []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  const handleApproveLocation = async (id: string) => {
    await moderationService.approveLocation(id);
    fetchModerationData();
  };

  const handleRejectLocation = async (id: string) => {
    await moderationService.rejectLocation(id);
    fetchModerationData();
  };

  const handleApproveProperty = async (id: string) => {
    await moderationService.approvePropertyName(id);
    fetchModerationData();
  };

  const handleRejectProperty = async (id: string) => {
    await moderationService.rejectPropertyName(id);
    fetchModerationData();
  };

  const handleApproveOption = async (id: string) => {
    await moderationService.approveOption(id);
    fetchModerationData();
  };

  const handleRejectOption = async (id: string) => {
    await moderationService.rejectOption(id);
    fetchModerationData();
  };

  const handleApproveMicroMarket = async (id: string) => {
    await locationService.approveMicroMarket(id);
    fetchModerationData();
  };

  const handleRejectMicroMarket = async (id: string) => {
    await locationService.rejectMicroMarket(id);
    fetchModerationData();
  };

  return (
    <PermissionGuard permission="locations:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view the moderation queue.</div>}>
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Moderation Queue</h1>
            <p className="text-gray-500 mt-1">Review and approve user-submitted data.</p>
          </div>
        </div>

        <Tabs defaultValue="locations" className="w-full">
          <TabsList className="mb-6 bg-white border shadow-sm p-1">
            <TabsTrigger value="locations" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm">
              Locations 
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {locations.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="propertyNames" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm">
              Property Names
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {propertyNames.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="customOptions" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm">
              Custom Options
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {customOptions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="microMarkets" className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm">
              Micro Markets
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {pendingMicroMarkets.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="focus-visible:outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : locations.length === 0 ? (
              <EmptyState message="No pending locations to review." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {locations.map(loc => (
                  <ModerationCard 
                    key={loc.id} 
                    item={loc} 
                    type="location" 
                    onApprove={() => handleApproveLocation(loc.id)} 
                    onReject={() => handleRejectLocation(loc.id)} 
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="propertyNames" className="focus-visible:outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : propertyNames.length === 0 ? (
              <EmptyState message="No pending property names to review." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {propertyNames.map(prop => (
                  <ModerationCard 
                    key={prop.id} 
                    item={prop} 
                    type="property-name" 
                    onApprove={() => handleApproveProperty(prop.id)} 
                    onReject={() => handleRejectProperty(prop.id)} 
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="customOptions" className="focus-visible:outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : customOptions.length === 0 ? (
              <EmptyState message="No pending custom options to review." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {customOptions.map(opt => (
                  <div key={opt.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{opt.option_label || opt.label}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Field: {opt.field?.label || 'Unknown'}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Val: {opt.option_value || opt.value}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Pending</Badge>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      <p>Submitted by: <span className="font-medium text-gray-700">{opt.created_by_user?.name || 'Unknown User'}</span></p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => handleApproveOption(opt.id)} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button onClick={() => handleRejectOption(opt.id)} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                        <X className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="microMarkets" className="focus-visible:outline-none">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : pendingMicroMarkets.length === 0 ? (
              <EmptyState message="No pending micro markets to review." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingMicroMarkets.map(mm => (
                  <div key={mm.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{mm.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">City: <span className="font-medium text-gray-700">{mm.city?.name || '—'}</span></p>
                      </div>
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Submitted by: <span className="font-medium text-gray-700">{mm.submitted_by_user?.name || mm.submitted_by_user?.email || 'Unknown'}</span></p>
                    <div className="flex gap-3">
                      <Button onClick={() => handleApproveMicroMarket(mm.id)} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button onClick={() => handleRejectMicroMarket(mm.id)} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
                        <X className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
        <Inbox className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
