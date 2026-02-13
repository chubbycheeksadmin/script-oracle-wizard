'use client';

import React, { useState, useEffect } from 'react';
import { FileText, MapPin, Camera, Users, Clock, Calculator, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  details?: string[];
  counts?: {
    label: string;
    value: number;
  }[];
}

interface ScriptBreakdownVisualizerProps {
  steps: AnalysisStep[];
  currentStep: string;
  overallProgress: number;
}

const stepIcons: Record<string, React.ReactNode> = {
  upload: <FileText className="w-5 h-5" />,
  extract: <FileText className="w-5 h-5" />,
  scenes: <Camera className="w-5 h-5" />,
  locations: <MapPin className="w-5 h-5" />,
  talent: <Users className="w-5 h-5" />,
  schedule: <Clock className="w-5 h-5" />,
  costs: <Calculator className="w-5 h-5" />,
  verdict: <CheckCircle className="w-5 h-5" />,
};

export function ScriptBreakdownVisualizer({ steps, currentStep, overallProgress }: ScriptBreakdownVisualizerProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Script Analysis</h3>
        <span className="text-sm text-gray-500">{Math.round(overallProgress)}% complete</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 ${
              step.status === 'active' 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : step.status === 'complete'
                ? 'bg-green-50 border-green-200'
                : step.status === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}
          >
            {/* Step Number & Icon */}
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step.status === 'active' 
                  ? 'bg-blue-500 text-white'
                  : step.status === 'complete'
                  ? 'bg-green-500 text-white'
                  : step.status === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {step.status === 'active' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : step.status === 'complete' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {stepIcons[step.id] || <FileText className="w-5 h-5 text-gray-400" />}
                <h4 className={`font-medium ${
                  step.status === 'active' ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {step.label}
                </h4>
              </div>

              {/* Details */}
              {step.details && step.details.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {step.details.map((detail, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                      {detail}
                    </li>
                  ))}
                </ul>
              )}

              {/* Counts - Visual Breakdown */}
              {step.counts && step.counts.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {step.counts.map((count, i) => (
                    <div 
                      key={i}
                      className="bg-white rounded-md border border-gray-200 p-3 text-center"
                    >
                      <div className="text-2xl font-bold text-blue-600">
                        {count.value}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {count.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook to simulate the breakdown process
export function useScriptBreakdown() {
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: 'upload', label: 'Uploading Script', status: 'pending' },
    { id: 'extract', label: 'Extracting Text', status: 'pending' },
    { id: 'scenes', label: 'Identifying Scenes', status: 'pending' },
    { id: 'locations', label: 'Analyzing Locations', status: 'pending' },
    { id: 'talent', label: 'Counting Talent', status: 'pending' },
    { id: 'schedule', label: 'Simulating Schedule', status: 'pending' },
    { id: 'costs', label: 'Calculating Costs', status: 'pending' },
    { id: 'verdict', label: 'Generating Verdict', status: 'pending' },
  ]);
  const [currentStep, setCurrentStep] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);

  const startAnalysis = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', details: [], counts: [] })));
    setOverallProgress(0);
    
    // Simulate step-by-step progression
    const stepSequence = [
      { 
        id: 'upload', 
        delay: 500, 
        details: ['PDF loaded', '8 pages detected'],
        counts: [{ label: 'Pages', value: 8 }]
      },
      { 
        id: 'extract', 
        delay: 1000, 
        details: ['Scene headers found', 'Action lines parsed', 'Dialogue extracted'],
        counts: [{ label: 'Lines', value: 342 }]
      },
      { 
        id: 'scenes', 
        delay: 1500, 
        details: ['INT/EXT classified', 'Day/Night identified', 'Shot complexity assessed'],
        counts: [{ label: 'Scenes', value: 12 }, { label: 'Shots', value: 28 }]
      },
      { 
        id: 'locations', 
        delay: 2000, 
        details: ['Kitchen - INT', 'Garden - EXT', 'Beach house - EXT'],
        counts: [{ label: 'Locations', value: 3 }, { label: 'Moves', value: 2 }]
      },
      { 
        id: 'talent', 
        delay: 2500, 
        details: ['Principal roles identified', 'Featured extras counted', 'Background estimated'],
        counts: [
          { label: 'Principal', value: 2 }, 
          { label: 'Featured', value: 4 },
          { label: 'Extras', value: 8 }
        ]
      },
      { 
        id: 'schedule', 
        delay: 3000, 
        details: ['11-hour days assumed', 'Setup time calculated', 'Company moves scheduled'],
        counts: [{ label: 'Days Needed', value: 2 }, { label: 'Setups/Day', value: 7 }]
      },
      { 
        id: 'costs', 
        delay: 3500, 
        details: ['Service company quoted', 'UK crew travel added', 'Prep days calculated'],
        counts: [
          { label: 'Service Cost', value: 115000 },
          { label: 'UK Costs', value: 85000 }
        ]
      },
      { 
        id: 'verdict', 
        delay: 4000, 
        details: ['Risk score: 4.2', 'Expected overrun: 12-18%', 'Recommendations generated', 'Verdict: AMBER'],
        counts: undefined
      },
    ];

    let completedSteps = 0;
    stepSequence.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => prev.map(s => 
          s.id === step.id 
            ? { ...s, status: 'active' }
            : s.id === stepSequence[index - 1]?.id
            ? { ...s, status: 'complete' }
            : s
        ));
        setCurrentStep(step.id);
        
        // Complete the step after a delay
        setTimeout(() => {
          setSteps(prev => prev.map(s => 
            s.id === step.id 
              ? { ...s, status: 'complete', details: step.details, counts: step.counts }
              : s
          ));
          completedSteps++;
          setOverallProgress((completedSteps / stepSequence.length) * 100);
        }, 400);
      }, step.delay);
    });
  };

  return { steps, currentStep, overallProgress, startAnalysis };
}

export default ScriptBreakdownVisualizer;
