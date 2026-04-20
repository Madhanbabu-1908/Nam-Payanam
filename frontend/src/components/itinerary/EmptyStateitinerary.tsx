import React from 'react';
import { MapPin, Plus, LayoutTemplate, AlertCircle } from 'lucide-react';

interface Props {
  onAddLocation: () => void;
  onUseTemplate: () => void;
}

export const EmptyStateItinerary: React.FC<Props> = ({ onAddLocation, onUseTemplate }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
      <div className="bg-indigo-50 p-4 rounded-full mb-4">
        <MapPin className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Start Building Your Trip</h3>
      <p className="text-gray-500 max-w-md mb-6">
        Your itinerary is empty. Add your first stop or use a template to get started quickly.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button onClick={onAddLocation} className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center">
          <Plus className="h-4 w-4 mr-2" /> Add Location
        </button>
        <button onClick={onUseTemplate} className="flex-1 bg-white text-primary border border-primary px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 flex items-center justify-center">
          <LayoutTemplate className="h-4 w-4 mr-2" /> Use Template
        </button>
      </div>
      <div className="mt-6 flex items-start text-left bg-yellow-50 p-3 rounded-lg border border-yellow-100">
        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
        <p className="text-sm text-yellow-700">Tip: You can reorder stops later by dragging them.</p>
      </div>
    </div>
  );
};