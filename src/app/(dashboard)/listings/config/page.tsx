'use client';

import { HierarchySelector } from '@/modules/listings/hierarchy-selector';
import { ConfigMatrix } from '@/modules/listings/config-matrix';
import { useMatrixStore } from '@/store/use-matrix-store';
import { Button } from '@/components/ui/button';
import { Save, X, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ListingConfigPage() {
  const { unsavedChanges, saveConfigs, resetChanges, isSaving } = useMatrixStore();
  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Module Config Matrix</h1>
          <p className="text-gray-500 mt-1">Configure form fields for property listing types dynamically.</p>
        </div>
      </div>

      <HierarchySelector />
      
      <ConfigMatrix />

      {/* Floating Action Bar for Saving */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6"
          >
            <div className="text-sm font-medium">
              You have unsaved configuration changes
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white hover:bg-white/10"
                onClick={resetChanges}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-white shadow-lg"
                onClick={saveConfigs}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
