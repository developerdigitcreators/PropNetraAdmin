'use client';

import { useEffect, useState } from 'react';
import { moderationService } from '@/services/moderation.service';
import { ModerationCard } from '@/modules/locations/moderation-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Inbox } from 'lucide-react';

export default function PendingModerationPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [propertyNames, setPropertyNames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      moderationService.getPendingLocations(),
      moderationService.getPendingPropertyNames()
    ])
      .then(([locs, props]) => {
        setLocations(locs);
        setPropertyNames(props);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleApproveLocation = async (id: string) => {
    await moderationService.approveLocation(id);
  };

  const handleRejectLocation = async (id: string) => {
    await moderationService.rejectLocation(id);
  };

  const handleApproveProperty = async (id: string) => {
    await moderationService.approvePropertyName(id);
  };

  const handleRejectProperty = async (id: string) => {
    await moderationService.rejectPropertyName(id);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Moderation Queue</h1>
          <p className="text-gray-500 mt-1">Review and approve user-submitted locations and property names.</p>
        </div>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="locations" className="text-sm">
            Locations 
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {locations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="propertyNames" className="text-sm">
            Property Names
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {propertyNames.length}
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
                  onApprove={handleApproveLocation} 
                  onReject={handleRejectLocation} 
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
                  onApprove={handleApproveProperty} 
                  onReject={handleRejectProperty} 
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
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
