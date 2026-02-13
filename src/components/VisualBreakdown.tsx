'use client';

import React from 'react';
import { MapPin, Users, Camera, Clock, CheckCircle } from 'lucide-react';

interface VisualBreakdownProps {
  scenes: number;
  locations: number;
  moves: number;
  principal: number;
  featured: number;
  extras: number;
  shots: number;
  days: number;
}

export function VisualBreakdown({ 
  scenes, 
  locations, 
  moves, 
  principal, 
  featured, 
  extras, 
  shots, 
  days 
}: VisualBreakdownProps) {
  const shotsPerDay = Math.round(shots / Math.max(1, days));
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Script Analysis Complete</h3>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {/* Step 1: Script */}
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-green-900">Script Extracted</span>
            <span className="text-sm text-green-700 ml-2">{scenes} scenes identified</span>
          </div>
        </div>

        {/* Step 2: Locations */}
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-green-900">Locations Analyzed</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{locations}</div>
              <div className="text-xs text-gray-500">Locations</div>
            </div>
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{moves}</div>
              <div className="text-xs text-gray-500">Moves</div>
            </div>
          </div>
        </div>

        {/* Step 3: Talent */}
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-green-900">Talent Counted</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{principal}</div>
              <div className="text-xs text-gray-500">Principal</div>
            </div>
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{featured}</div>
              <div className="text-xs text-gray-500">Featured</div>
            </div>
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{extras}</div>
              <div className="text-xs text-gray-500">Extras</div>
            </div>
          </div>
        </div>

        {/* Step 4: Shots */}
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            <Camera className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-green-900">Shots Estimated</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{shots}</div>
              <div className="text-xs text-gray-500">Total Shots</div>
            </div>
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{Math.ceil(shots / 3)}</div>
              <div className="text-xs text-gray-500">Setups</div>
            </div>
          </div>
        </div>

        {/* Step 5: Schedule */}
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-green-900">Schedule Simulated</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{days}</div>
              <div className="text-xs text-gray-500">Days Needed</div>
            </div>
            <div className="bg-white px-3 py-1 rounded text-center min-w-[60px]">
              <div className="text-lg font-bold text-blue-600">{shotsPerDay}</div>
              <div className="text-xs text-gray-500">Shots/Day</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VisualBreakdown;
