'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, MapPin, Building } from 'lucide-react';
import { useState } from 'react';

interface ModerationItemProps {
  item: any;
  type: 'location' | 'property-name';
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function ModerationCard({ item, type, onApprove, onReject }: ModerationItemProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(item.id);
      setStatus('approved');
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(item.id);
      setStatus('rejected');
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (status !== 'pending') {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between opacity-60">
        <div>
          <h4 className="font-medium text-gray-900 line-through decoration-gray-300">{item.name}</h4>
          <p className="text-xs text-gray-500 mt-1">Processed</p>
        </div>
        <Badge variant="outline" className={status === 'approved' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}>
          {status === 'approved' ? 'Approved' : 'Rejected'}
        </Badge>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 bg-blue-50 text-blue-600 rounded-lg">
            {type === 'location' ? <MapPin className="w-5 h-5" /> : <Building className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-lg">{item.name}</h4>
            <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
              {item.city && (
                <p><span className="text-gray-400">City:</span> {item.city.name || item.city_id}</p>
              )}
              {item.micro_market && (
                <p><span className="text-gray-400">Micro-Market:</span> {item.micro_market.name}</p>
              )}
              {item.location && (
                <p><span className="text-gray-400">Location:</span> {item.location.name}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Submitted by {item.submitted_by_user?.name || 'User'} on {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-medium">
          Pending Review
        </Badge>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
        <Button 
          variant="outline" 
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
          onClick={handleReject}
          disabled={isProcessing}
        >
          <X className="w-4 h-4 mr-1.5" />
          Reject
        </Button>
        <Button 
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleApprove}
          disabled={isProcessing}
        >
          <Check className="w-4 h-4 mr-1.5" />
          Approve
        </Button>
      </div>
    </div>
  );
}
