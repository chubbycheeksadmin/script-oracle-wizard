'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AssessmentInput, AssessmentOutput, ShootingContext, EUCountry, UsageTerritory, AIBreakdownResponse } from '@/types';
import { runAssessment, createDefaultInput, formatCurrency } from '@/lib/breakdown/assessor';
import { Upload, FileText, ChevronRight, ChevronLeft, Sparkles, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';

// Film quotes for rotation
const FILM_QUOTES = [
  { text: "What's the most you ever lost on a coin toss?", film: "No Country for Old Men" },
  { text: "You're gonna need a bigger boat.", film: "Jaws" },
  { text: "Show me the money!", film: "Jerry Maguire" },
  { text: "I love the smell of napalm in the morning.", film: "Apocalypse Now" },
  { text: "I'll be back.", film: "The Terminator" },
  { text: "There's no place like home.", film: "The Wizard of Oz" },
];

// Wizard steps
type Step = 'landing' | 'script' | 'context' | 'assumptions' | 'complexity' | 'politics' | 'processing' | 'results';

export default function TypeformWizard() {
  // Current step
  const [currentStep, setCurrentStep] = useState<Step>('landing');
  const [stepDirection, setStepDirection] = useState<'next' | 'prev'>('next');
  
  // Quote rotation
  const [currentQuote, setCurrentQuote] = useState(0);
  
  // Form state
  const [input, setInput] = useState<AssessmentInput>(createDefaultInput());
  const [output, setOutput] = useState<AssessmentOutput | null>(null);
  const [producerAssumptions, setProducerAssumptions] = useState({
    shootDays: 3,
    postBudget: 100000,
    totalBudget: undefined as number | undefined,
    hasBudgetIndication: false,
  });
  
  // PDF upload state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'extracting' | 'analyzing' | 'done' | 'error'>('idle');
  const [aiBreakdown, setAiBreakdown] = useState<AIBreakdownResponse | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Progress calculation
  const getProgress = () => {
    const steps: Step[] = ['landing', 'script', 'context', 'assumptions', 'complexity', 'politics', 'processing', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex) / (steps.length - 1)) * 100;
  };
  
  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % FILM_QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && currentStep !== 'landing' && currentStep !== 'results') {
        handleNext();
      } else if (e.key === 'Escape' && currentStep !== 'landing') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);
  
  // Navigation handlers
  const handleNext = () => {
    setStepDirection('next');
    const stepFlow: Record<Step, Step> = {
      landing: 'script',
      script: 'context',
      context: 'assumptions',
      assumptions: 'complexity',
      complexity: 'politics',
      politics: 'processing',
      processing: 'results',
      results: 'results',
    };
    
    if (currentStep === 'politics') {
      // Run assessment before showing results
      runAssessmentAndShowResults();
    } else {
      setCurrentStep(stepFlow[currentStep]);
    }
  };
  
  const handleBack = () => {
    setStepDirection('prev');
    const stepBack: Record<Step, Step> = {
      landing: 'landing',
      script: 'landing',
      context: 'script',
      assumptions: 'context',
      complexity: 'assumptions',
      politics: 'complexity',
      processing: 'politics',
      results: 'politics',
    };
    setCurrentStep(stepBack[currentStep]);
  };
  
  const runAssessmentAndShowResults = () => {
    setCurrentStep('processing');
    
    // Simulate processing delay for effect
    setTimeout(() => {
      const assessmentInput = {
        ...input,
        aiBreakdown: aiBreakdown?.breakdown || undefined,
      };
      const result = runAssessment(assessmentInput);
      setOutput(result);
      setCurrentStep('results');
    }, 2000);
  };
  
  // PDF upload handler - Server-side parsing
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type (some browsers don't report MIME type correctly)
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      setExtractionError('Please upload a PDF file');
      setPdfLoading(false);
      return;
    }

    setPdfLoading(true);
    setPdfStatus('extracting');
    setExtractionError(null);
    setAiBreakdown(null);
    setAnalysisLogs(['Reading PDF file...']);

    try {
      setAnalysisLogs(prev => [...prev, `Extracting text from ${file.name}...`]);
      
      // Send PDF to server-side API for parsing
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('[PDF Upload] Sending file to API:', file.name, file.size);
      
      const parseResponse = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[PDF Upload] Response status:', parseResponse.status);
      
      if (!parseResponse.ok) {
        const errorText = await parseResponse.text();
        console.error('[PDF Upload] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Server error: ${parseResponse.status}`);
      }
      
      const parseResult = await parseResponse.json();
      const rawText = parseResult.text;
      
      if (!rawText || rawText.length < 50) {
        setPdfStatus('error');
        setExtractionError('PDF appears to be empty or contains no extractable text');
        setPdfLoading(false);
        return;
      }

      setAnalysisLogs(prev => [...prev, `Extracted ${rawText.length.toLocaleString()} characters from ${parseResult.pageCount} pages`, 'Initializing AI analysis...']);
      setPdfStatus('analyzing');
      
      // Import AI breakdown function
      const { getAIBreakdownStreaming } = await import('@/lib/parser/pdfParser');
      
      await getAIBreakdownStreaming(
        rawText,
        (progress) => {
          // Update progress logs based on stage
          setAnalysisLogs(prev => [...prev, progress.message]);
        },
        (breakdownResult) => {
          if (breakdownResult.scriptExtracted && breakdownResult.breakdown) {
            const rollup = breakdownResult.breakdown.rollup;
            setAnalysisLogs(prev => [
              ...prev,
              `✓ Identified ${breakdownResult.breakdown!.totalScenes} scenes`,
              `✓ Found ${breakdownResult.breakdown!.uniqueLocations} unique locations`,
              `✓ Estimated ${rollup?.estimatedShootDays} shoot days`,
              rollup?.hasTechnicalShots ? '✓ Detected technical shots' : null,
              rollup?.hasHeroProduct ? '✓ Found hero product moment' : null,
              rollup?.vfxComplexity !== 'none' ? `✓ VFX complexity: ${rollup?.vfxComplexity}` : null,
            ].filter(Boolean) as string[]);
            
            setAiBreakdown(breakdownResult);
            setInput(prev => ({ ...prev, scriptText: breakdownResult.rawScriptText || rawText }));
            setPdfStatus('done');
            
            // Auto-populate from AI analysis
            if (rollup) {
              setInput(prev => ({
                ...prev,
                proposedShootDays: rollup.estimatedShootDays,
                companyMovesPerDay: Math.ceil(breakdownResult.breakdown!.companyMoves / Math.max(1, rollup.estimatedShootDays)),
                complexity: {
                  ...prev.complexity,
                  technical: rollup.hasTechnicalShots,
                  heroProduct: rollup.hasHeroProduct,
                  vfxLight: rollup.vfxComplexity === 'light',
                  vfxHeavy: rollup.vfxComplexity === 'heavy',
                },
              }));
              setProducerAssumptions(prev => ({
                ...prev,
                shootDays: rollup.estimatedShootDays,
              }));
            }
          } else {
            setPdfStatus('error');
            setExtractionError(breakdownResult.error || 'Could not analyze script');
          }
          setPdfLoading(false);
        },
        (error: string) => {
          setPdfStatus('error');
          setExtractionError(error);
          setPdfLoading(false);
        }
      );
    } catch (error) {
      console.error('[PDF Upload] Caught error:', error);
      setPdfStatus('error');
      setExtractionError(error instanceof Error ? error.message : 'Error reading PDF');
      setPdfLoading(false);
    }
  };
  
  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 'landing':
        return <LandingStep onStart={() => setCurrentStep('script')} currentQuote={currentQuote} />;
      case 'script':
        return (
          <ScriptStep
            pdfLoading={pdfLoading}
            pdfStatus={pdfStatus}
            aiBreakdown={aiBreakdown}
            extractionError={extractionError}
            scriptText={input.scriptText || ''}
            analysisLogs={analysisLogs}
            onScriptChange={(text) => setInput(prev => ({ ...prev, scriptText: text }))}
            onUploadClick={() => fileInputRef.current?.click()}
            onFileDrop={(file) => {
              // Programmatically set files on the hidden input and call the handler directly
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              if (fileInputRef.current) {
                fileInputRef.current.files = dataTransfer.files;
              }
              handlePDFUpload({ target: { files: dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>);
            }}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'context':
        return (
          <ContextStep
            input={input}
            onUpdate={(updates) => setInput(prev => ({ ...prev, ...updates }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'assumptions':
        return (
          <AssumptionsStep
            assumptions={producerAssumptions}
            onUpdate={setProducerAssumptions}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'complexity':
        return (
          <ComplexityStep
            complexity={input.complexity}
            aiBreakdown={aiBreakdown}
            onUpdate={(complexity) => setInput(prev => ({ ...prev, complexity }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'politics':
        return (
          <PoliticsStep
            politics={input.politics}
            onUpdate={(politics) => setInput(prev => ({ ...prev, politics }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 'processing':
        return <ProcessingStep />;
      case 'results':
        return (
          <ResultsStep
            output={output}
            input={input}
            producerAssumptions={producerAssumptions}
            onRestart={() => {
              setInput(createDefaultInput());
              setOutput(null);
              setAiBreakdown(null);
              setCurrentStep('landing');
            }}
          />
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePDFUpload}
        className="hidden"
      />
      
      {/* Progress bar (hidden on landing) */}
      {currentStep !== 'landing' && currentStep !== 'results' && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${getProgress()}%` }} />
          </div>
          <div className="flex justify-between px-6 py-3 text-xs text-gray-500 uppercase tracking-widest">
            <span>The Script Oracle</span>
            <span>Step {['script', 'context', 'assumptions', 'complexity', 'politics'].indexOf(currentStep) + 1} of 5</span>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main className={`${stepDirection === 'next' ? 'slide-right' : 'slide-left'}`}>
        {renderStep()}
      </main>
    </div>
  );
}

// ========== STEP COMPONENTS ==========

function LandingStep({ onStart, currentQuote }: { onStart: () => void; currentQuote: number }) {
  return (
    <div className="wizard-step items-center text-center relative overflow-hidden">
      {/* Subtle gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.15) 0%, transparent 70%)' }} 
      />
      
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Logo/icon */}
        <div className="mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.2) 0%, rgba(201,162,39,0.05) 100%)', border: '1px solid rgba(201,162,39,0.3)' }}>
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-4">
            <span className="text-gray-400">The</span>{' '}
            <span className="gradient-text font-medium">Script Oracle</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 font-light tracking-wide">
            AI-powered production feasibility
          </p>
        </div>
        
        {/* Revolving quote */}
        <div className="h-32 flex items-center justify-center mb-12 max-w-2xl mx-auto px-4">
          <div key={currentQuote} className="quote-fade">
            <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed film-quote">
              "{FILM_QUOTES[currentQuote].text}"
            </p>
            <p className="text-xs text-gray-600 mt-4 uppercase tracking-[0.2em]">
              {FILM_QUOTES[currentQuote].film}
            </p>
          </div>
        </div>
        
        {/* CTA */}
        <button onClick={onStart} className="btn-primary text-base px-10 py-5">
          Start Assessment
        </button>
        
        <p className="mt-10 text-sm text-gray-600 tracking-wide">
          Know before you commit
        </p>
      </div>
    </div>
  );
}

// Helper to strip HTML tags and clean up error messages
function cleanErrorMessage(error: string): string {
  // Strip HTML tags
  const stripped = error.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // If it's just generic HTML error text, return a user-friendly message
  if (stripped.toLowerCase().includes('inactivity timeout') || stripped.toLowerCase().includes('timeout')) {
    return 'Upload timed out. Please try again.';
  }
  if (stripped.toLowerCase().includes('bad gateway') || stripped.toLowerCase().includes('502')) {
    return 'Server error. Please try again in a moment.';
  }
  if (stripped.length > 200) {
    // If it's a very long error, truncate it
    return 'Something went wrong. Please try again or paste text instead.';
  }
  
  return stripped || 'Something went wrong. Please try again.';
}

function ScriptStep({
  pdfLoading,
  pdfStatus,
  aiBreakdown,
  extractionError,
  scriptText,
  analysisLogs,
  onScriptChange,
  onUploadClick,
  onFileDrop,
  onNext,
  onBack,
}: {
  pdfLoading: boolean;
  pdfStatus: string;
  aiBreakdown: AIBreakdownResponse | null;
  extractionError: string | null;
  scriptText: string;
  analysisLogs: string[];
  onScriptChange: (text: string) => void;
  onUploadClick: () => void;
  onFileDrop: (file: File) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileDrop(file);
    }
  };
  
  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysisLogs]);
  
  return (
    <div className="wizard-step max-w-2xl mx-auto">
      <div className="mb-2">
        <span className="step-counter">Step 1 of 5</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-light mb-3 tracking-tight">
        Upload your script
      </h2>
      <p className="text-gray-500 mb-8 text-base leading-relaxed">
        We'll analyze it for locations, setups, VFX, and talent requirements.
      </p>
      
      {/* Upload area */}
      <div
        className={`drop-zone mb-6 ${isDragging ? 'drag-over' : ''}`}
        onClick={onUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {pdfLoading && pdfStatus === 'extracting' ? (
          <div className="flex flex-col items-center py-4">
            <div className="relative mb-6">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <div className="absolute inset-0 pulse-gold rounded-full"></div>
            </div>
            <p className="text-base text-amber-400 font-medium">Reading PDF...</p>
            <p className="text-sm text-gray-600 mt-2">Extracting text from pages</p>
          </div>
        ) : pdfLoading && pdfStatus === 'analyzing' ? (
          <div className="flex flex-col items-center py-4">
            <div className="relative mb-6">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <div className="absolute inset-0 pulse-gold rounded-full"></div>
            </div>
            <p className="text-base text-amber-400 font-medium">Analyzing with AI...</p>
          </div>
        ) : aiBreakdown?.breakdown ? (
          <div className="flex flex-col items-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-base text-green-400 font-medium">Analysis complete</p>
            <p className="text-sm text-gray-500 mt-2">
              {aiBreakdown.breakdown.totalScenes} scenes • {aiBreakdown.breakdown.rollup?.estimatedShootDays} days
            </p>
          </div>
        ) : extractionError ? (
          <div className="flex flex-col items-center py-4 px-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-base text-red-400 text-center">{cleanErrorMessage(extractionError)}</p>
            <p className="text-sm text-gray-500 mt-2">Paste text below instead</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
              <Upload className="w-7 h-7 text-gray-500" />
            </div>
            <p className="text-base text-gray-300 mb-1 font-medium">Drop PDF or click to browse</p>
            <p className="text-sm text-gray-600">Scripts, treatments, board decks</p>
          </div>
        )}
      </div>
      
      {/* Analysis Logs */}
      {pdfLoading && analysisLogs.length > 0 && (
        <div className="card-dark mb-6 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Analysis Progress</p>
          <div className="space-y-2">
            {analysisLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {log.startsWith('✓') ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></div>
                )}
                <span className={log.startsWith('✓') ? 'text-gray-300' : 'text-gray-400'}>
                  {log}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
      
      {/* Or paste text */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-white/5"></div>
          <span className="text-xs text-gray-600 uppercase tracking-widest">Or paste text</span>
          <div className="flex-1 h-px bg-white/5"></div>
        </div>
        <textarea
          value={scriptText}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder="Paste your script here..."
          className="input-dark h-36 font-mono text-sm resize-none"
        />
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-4 h-4 inline mr-2" /> Back
        </button>
        <button 
          onClick={onNext} 
          className="btn-primary"
          disabled={pdfLoading}
        >
          Continue <ChevronRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </div>
  );
}

function ContextStep({
  input,
  onUpdate,
  onNext,
  onBack,
}: {
  input: AssessmentInput;
  onUpdate: (updates: Partial<AssessmentInput>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="wizard-step max-w-2xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-light mb-12">
        Where are you shooting?
      </h2>
      
      {/* Shooting context */}
      <div className="mb-12">
        <div className="flex gap-4">
          <button
            onClick={() => onUpdate({ shootingContext: 'UK' })}
            className={`toggle-btn flex-1 py-6 text-lg ${input.shootingContext === 'UK' ? 'active' : ''}`}
          >
            UK
          </button>
          <button
            onClick={() => onUpdate({ shootingContext: 'EU' })}
            className={`toggle-btn flex-1 py-6 text-lg ${input.shootingContext === 'EU' ? 'active' : ''}`}
          >
            EU
          </button>
        </div>
      </div>
      
      {/* EU Country selector */}
      {input.shootingContext === 'EU' && (
        <div className="mb-12 animate-fadeIn">
          <p className="text-sm text-gray-500 mb-3 uppercase tracking-widest">Which country?</p>
          <select
            value={input.euCountry}
            onChange={(e) => onUpdate({ euCountry: e.target.value as EUCountry })}
            className="input-dark"
          >
            <option value="EU_Average">EU Average</option>
            <option value="Poland">Poland</option>
            <option value="Bulgaria">Bulgaria</option>
            <option value="Czech">Czech Republic</option>
            <option value="Serbia">Serbia</option>
            <option value="Georgia">Georgia</option>
            <option value="Spain">Spain</option>
            <option value="Portugal">Portugal</option>
          </select>
        </div>
      )}
      
      {/* Usage territory */}
      <div className="mb-12">
        <p className="text-sm text-gray-500 mb-4 uppercase tracking-widest">Where will this air?</p>
        <div className="flex gap-4">
          {(['UK', 'US', 'Worldwide'] as UsageTerritory[]).map((territory) => (
            <button
              key={territory}
              onClick={() => onUpdate({ usageTerritory: territory })}
              className={`toggle-btn flex-1 py-4 ${input.usageTerritory === territory ? 'active' : ''}`}
            >
              {territory}
            </button>
          ))}
        </div>
      </div>
      
      {/* Usage term */}
      <div className="mb-12">
        <p className="text-sm text-gray-500 mb-4 uppercase tracking-widest">Usage term?</p>
        <div className="flex items-center gap-6">
          <input
            type="range"
            min="1"
            max="3"
            value={input.usageTerm}
            onChange={(e) => onUpdate({ usageTerm: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-2xl text-amber-400 font-medium w-24">
            {input.usageTerm} year{input.usageTerm > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-5 h-5 inline mr-1" /> Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Continue <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );
}

interface ProducerAssumptions {
  shootDays: number;
  postBudget: number;
  totalBudget: number | undefined;
  hasBudgetIndication: boolean;
}

function AssumptionsStep({
  assumptions,
  onUpdate,
  onNext,
  onBack,
}: {
  assumptions: ProducerAssumptions;
  onUpdate: (a: ProducerAssumptions) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="wizard-step max-w-2xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-light mb-4">
        What are you assuming?
      </h2>
      <p className="text-gray-400 mb-12 text-lg">
        We'll compare your assumptions against what the script actually needs.
      </p>
      
      {/* Budget indication */}
      <div className="mb-12">
        <p className="text-sm text-gray-500 mb-4 uppercase tracking-widest">Do you have budget indication?</p>
        <div className="flex gap-4">
          <button
            onClick={() => onUpdate({ ...assumptions, hasBudgetIndication: true })}
            className={`toggle-btn flex-1 py-4 ${assumptions.hasBudgetIndication ? 'active' : ''}`}
          >
            Yes
          </button>
          <button
            onClick={() => onUpdate({ ...assumptions, hasBudgetIndication: false, totalBudget: undefined })}
            className={`toggle-btn flex-1 py-4 ${!assumptions.hasBudgetIndication ? 'active' : ''}`}
          >
            No indication
          </button>
        </div>
      </div>
      
      {/* Total budget */}
      {assumptions.hasBudgetIndication && (
        <div className="mb-12 animate-fadeIn">
          <p className="text-sm text-gray-500 mb-3 uppercase tracking-widest">Client's budget</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">£</span>
            <input
              type="number"
              value={assumptions.totalBudget || ''}
              onChange={(e) => onUpdate({ ...assumptions, totalBudget: parseInt(e.target.value) || undefined })}
              placeholder="300000"
              className="input-dark pl-10"
            />
          </div>
        </div>
      )}
      
      {/* Shoot days */}
      <div className="mb-12">
        <p className="text-sm text-gray-500 mb-3 uppercase tracking-widest">How many shoot days?</p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onUpdate({ ...assumptions, shootDays: Math.max(1, assumptions.shootDays - 1) })}
            className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 text-2xl hover:bg-white/10 transition-colors"
          >
            −
          </button>
          <span className="text-4xl font-light text-amber-400 w-20 text-center">
            {assumptions.shootDays}
          </span>
          <button
            onClick={() => onUpdate({ ...assumptions, shootDays: assumptions.shootDays + 1 })}
            className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 text-2xl hover:bg-white/10 transition-colors"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Post budget */}
      <div className="mb-12">
        <p className="text-sm text-gray-500 mb-3 uppercase tracking-widest">Post budget estimate</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">£</span>
          <input
            type="number"
            value={assumptions.postBudget}
            onChange={(e) => onUpdate({ ...assumptions, postBudget: parseInt(e.target.value) || 0 })}
            className="input-dark pl-10"
          />
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-5 h-5 inline mr-1" /> Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Continue <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function ComplexityStep({
  complexity,
  aiBreakdown,
  onUpdate,
  onNext,
  onBack,
}: {
  complexity: AssessmentInput['complexity'];
  aiBreakdown: AIBreakdownResponse | null;
  onUpdate: (c: AssessmentInput['complexity']) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (key: keyof typeof complexity) => {
    onUpdate({ ...complexity, [key]: !complexity[key] });
  };
  
  // AI-detected flags
  const aiFlags = [];
  if (aiBreakdown?.breakdown?.rollup?.hasTechnicalShots) {
    aiFlags.push({ key: 'technical', label: 'Technical shots detected', description: 'Motion control or high-speed' });
  }
  if (aiBreakdown?.breakdown?.rollup?.hasHeroProduct) {
    aiFlags.push({ key: 'heroProduct', label: 'Hero product moment', description: 'Signature product shot' });
  }
  if (aiBreakdown?.breakdown?.rollup?.vfxComplexity === 'light') {
    aiFlags.push({ key: 'vfxLight', label: 'Light VFX', description: 'Cleanup or simple compositing' });
  }
  if (aiBreakdown?.breakdown?.rollup?.vfxComplexity === 'heavy') {
    aiFlags.push({ key: 'vfxHeavy', label: 'Heavy VFX', description: 'CG elements or complex compositing' });
  }
  
  const manualFlags = [
    { key: 'fixInPost', label: '"Fix it in post" mentality', description: 'Team assumes everything can be saved in edit' },
    { key: 'multipleHeroTalent', label: 'Multiple hero talent', description: 'More than 2 principal cast members' },
    { key: 'specialEquipment', label: 'Special equipment', description: 'Crane, drone, gimbal, etc.' },
    { key: 'childrenInvolved', label: 'Children on set', description: 'Under 16s (hour restrictions apply)' },
    { key: 'childrenUnder5', label: 'Children under 5', description: 'Most restrictive scheduling' },
  ];
  
  return (
    <div className="wizard-step max-w-3xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-light mb-4">
        Complexity factors
      </h2>
      <p className="text-gray-400 mb-8 text-lg">
        Any of these apply to this production?
      </p>
      
      {/* AI detected flags */}
      {aiFlags.length > 0 && (
        <div className="mb-8">
          <p className="text-sm text-amber-400 mb-4 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Detected
          </p>
          <div className="grid gap-3">
            {aiFlags.map((flag) => (
              <button
                key={flag.key}
                onClick={() => toggle(flag.key as keyof typeof complexity)}
                className={`card-dark text-left transition-all ${complexity[flag.key as keyof typeof complexity] ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{flag.label}</p>
                    <p className="text-sm text-gray-400">{flag.description}</p>
                  </div>
                  <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${complexity[flag.key as keyof typeof complexity] ? 'bg-amber-500 border-amber-500' : 'border-gray-600'}`}>
                    {complexity[flag.key as keyof typeof complexity] && <CheckCircle className="w-4 h-4 text-black" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Manual flags */}
      <div className="grid gap-3">
        {manualFlags.map((flag) => (
          <button
            key={flag.key}
            onClick={() => toggle(flag.key as keyof typeof complexity)}
            className={`card-dark text-left transition-all ${complexity[flag.key as keyof typeof complexity] ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">{flag.label}</p>
                <p className="text-sm text-gray-400">{flag.description}</p>
              </div>
              <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${complexity[flag.key as keyof typeof complexity] ? 'bg-amber-500 border-amber-500' : 'border-gray-600'}`}>
                {complexity[flag.key as keyof typeof complexity] && <CheckCircle className="w-4 h-4 text-black" />}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between mt-12">
        <button onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-5 h-5 inline mr-1" /> Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Continue <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function PoliticsStep({
  politics,
  onUpdate,
  onNext,
  onBack,
}: {
  politics: AssessmentInput['politics'];
  onUpdate: (p: AssessmentInput['politics']) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (key: keyof typeof politics) => {
    onUpdate({ ...politics, [key]: !politics[key] });
  };
  
  const flags = [
    { key: 'numberBeforeBoardsLocked', label: 'Number agreed before boards locked', description: 'Budget committed before creative is finalized' },
    { key: 'procurementInvolvedEarly', label: 'Procurement involved early', description: 'Finance team scrutinizing costs from day one' },
    { key: 'multipleAgencyStakeholders', label: 'Multiple agency stakeholders', description: 'Account, creative, and planning all have input' },
    { key: 'clientOnSet', label: 'Client attending shoot', description: 'Decision-maker will be on set (adds pressure)' },
  ];
  
  return (
    <div className="wizard-step max-w-3xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-light mb-4">
        The politics
      </h2>
      <p className="text-gray-400 mb-8 text-lg">
        The uncomfortable questions...
      </p>
      
      <div className="grid gap-3">
        {flags.map((flag) => (
          <button
            key={flag.key}
            onClick={() => toggle(flag.key as keyof typeof politics)}
            className={`card-dark text-left transition-all ${politics[flag.key as keyof typeof politics] ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-white">{flag.label}</p>
                <p className="text-sm text-gray-400">{flag.description}</p>
              </div>
              <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${politics[flag.key as keyof typeof politics] ? 'bg-amber-500 border-amber-500' : 'border-gray-600'}`}>
                {politics[flag.key as keyof typeof politics] && <CheckCircle className="w-4 h-4 text-black" />}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between mt-12">
        <button onClick={onBack} className="btn-secondary">
          <ChevronLeft className="w-5 h-5 inline mr-1" /> Back
        </button>
        <button onClick={onNext} className="btn-primary">
          Run Assessment <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );
}

function ProcessingStep() {
  return (
    <div className="wizard-step items-center text-center">
      <Loader2 className="w-16 h-16 text-amber-400 animate-spin mb-8" />
      <h2 className="text-3xl font-light mb-4">Analyzing your script...</h2>
      <p className="text-gray-400">Comparing assumptions against reality</p>
    </div>
  );
}

function ResultsStep({
  output,
  input,
  producerAssumptions,
  onRestart,
}: {
  output: AssessmentOutput | null;
  input: AssessmentInput;
  producerAssumptions: ProducerAssumptions;
  onRestart: () => void;
}) {
  if (!output) return null;
  
  const verdictClass = output.verdict === 'GREEN' ? 'verdict-green' : output.verdict === 'AMBER' ? 'verdict-amber' : 'verdict-red';
  const verdictText = output.verdict === 'GREEN' ? 'LOOKS ACHIEVABLE' : output.verdict === 'AMBER' ? 'PRESSURE POINTS IDENTIFIED' : 'SIGNIFICANT CHALLENGES';
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-12">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-light">
            The <span className="text-amber-400">Script Oracle</span>
          </h1>
          <button onClick={onRestart} className="btn-secondary text-sm">
            Start over
          </button>
        </div>
        
        {/* Verdict */}
        <div className={`p-8 rounded-2xl border ${verdictClass} text-center mb-12`}>
          <p className="text-sm uppercase tracking-widest mb-2 opacity-80">Assessment</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{verdictText}</h2>
          <p className="text-lg opacity-90">{output.verdictReason}</p>
        </div>
      </div>
      
      {/* Comparison */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
        {/* Producer assumptions */}
        <div className="comparison-assumed rounded-xl p-6">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-6">What you assumed</p>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Shoot days</span>
              <span className="text-xl">{producerAssumptions.shootDays}</span>
            </div>
            {producerAssumptions.hasBudgetIndication && producerAssumptions.totalBudget && (
              <div className="flex justify-between">
                <span className="text-gray-400">Client budget</span>
                <span className="text-xl">{formatCurrency(producerAssumptions.totalBudget)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Post budget</span>
              <span className="text-xl">{formatCurrency(producerAssumptions.postBudget)}</span>
            </div>
          </div>
        </div>
        
        {/* Reality */}
        <div className="comparison-reality rounded-xl p-6">
          <p className="text-sm text-amber-400 uppercase tracking-widest mb-6">Script reality</p>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Recommended days</span>
              <span className="text-xl text-amber-400">{output.recommendedShootDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Production band</span>
              <span className="text-xl text-amber-400">
                {formatCurrency(output.productionCost.totalProduction.lean)} - {formatCurrency(output.productionCost.totalProduction.ambitious)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Post minimum</span>
              <span className="text-xl text-amber-400">{formatCurrency(output.postProduction.minimum)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="max-w-5xl mx-auto">
        <div className="card-dark mb-8">
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">Summary</p>
          <p className="text-lg leading-relaxed">{output.copyReadySummary}</p>
        </div>
        
        {/* What to challenge */}
        {output.whatToChallenge.length > 0 && (
          <div className="card-dark mb-8">
            <p className="text-sm text-amber-400 uppercase tracking-widest mb-4">What to challenge first</p>
            <ul className="space-y-2">
              {output.whatToChallenge.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-amber-400 mt-1">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Producer Summary - Technical Breakdown */}
        {output.producerSummary?.technical && output.producerSummary.technical.length > 0 && (
          <div className="card-dark mb-8">
            <p className="text-sm text-blue-400 uppercase tracking-widest mb-4">Technical Breakdown</p>
            <ul className="space-y-2">
              {output.producerSummary.technical.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">›</span>
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Producer Summary - Risk Factors */}
        {output.producerSummary?.risks && output.producerSummary.risks.length > 0 && (
          <div className="card-dark mb-8 border-l-4 border-red-500">
            <p className="text-sm text-red-400 uppercase tracking-widest mb-4">Risk Factors</p>
            <ul className="space-y-2">
              {output.producerSummary.risks.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-red-400 mt-1">!</span>
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Producer Summary - Producer Checklist */}
        {output.producerSummary?.checklist && output.producerSummary.checklist.length > 0 && (
          <div className="card-dark mb-8 border-l-4 border-amber-500">
            <p className="text-sm text-amber-400 uppercase tracking-widest mb-4">Producer Checklist</p>
            <ul className="space-y-2">
              {output.producerSummary.checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-amber-400 mt-1">□</span>
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Copy button */}
        <button
          onClick={() => navigator.clipboard.writeText(output.copyReadySummary)}
          className="btn-gold w-full"
        >
          <FileText className="w-5 h-5 inline mr-2" /> Copy summary to clipboard
        </button>
      </div>
    </div>
  );
}
