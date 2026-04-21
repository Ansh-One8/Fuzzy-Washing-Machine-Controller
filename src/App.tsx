/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Area, 
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { Settings2, Waves, Zap, FileCode2, History, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { FuzzyVariable, Rule } from './types';
import { FuzzyEngine, getMembership } from './fuzzyEngine';

/** Utility for tailwind classes */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Configuration ---

const FUZZY_VARIABLES: FuzzyVariable[] = [
  {
    name: 'Dirt Level',
    unit: '%',
    range: [0, 100],
    membershipFunctions: [
      { name: 'Low', type: 'triangular', points: [0, 0, 40] },
      { name: 'Medium', type: 'triangular', points: [30, 50, 70] },
      { name: 'High', type: 'triangular', points: [60, 100, 100] },
    ]
  },
  {
    name: 'Load Size',
    unit: 'kg',
    range: [0, 10],
    membershipFunctions: [
      { name: 'Small', type: 'triangular', points: [0, 0, 4] },
      { name: 'Medium', type: 'triangular', points: [3, 5, 7] },
      { name: 'Large', type: 'triangular', points: [6, 10, 10] },
    ]
  },
  {
    name: 'Cycle Time',
    unit: 'min',
    range: [0, 120],
    membershipFunctions: [
      { name: 'Very Short', type: 'triangular', points: [0, 0, 30] },
      { name: 'Short', type: 'triangular', points: [20, 40, 60] },
      { name: 'Medium', type: 'triangular', points: [50, 70, 90] },
      { name: 'Long', type: 'triangular', points: [80, 120, 120] },
    ]
  }
];

const RULES: Rule[] = [
  { id: '1', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'Low' }, { variable: 'Load Size', is: 'Small' }], then: { variable: 'Cycle Time', is: 'Very Short' } },
  { id: '2', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'Low' }, { variable: 'Load Size', is: 'Medium' }], then: { variable: 'Cycle Time', is: 'Short' } },
  { id: '3', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'Medium' }, { variable: 'Load Size', is: 'Small' }], then: { variable: 'Cycle Time', is: 'Short' } },
  { id: '4', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'Medium' }, { variable: 'Load Size', is: 'Medium' }], then: { variable: 'Cycle Time', is: 'Medium' } },
  { id: '5', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'High' }, { variable: 'Load Size', is: 'Small' }], then: { variable: 'Cycle Time', is: 'Medium' } },
  { id: '6', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'High' }, { variable: 'Load Size', is: 'Medium' }], then: { variable: 'Cycle Time', is: 'Long' } },
  { id: '7', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'High' }, { variable: 'Load Size', is: 'Large' }], then: { variable: 'Cycle Time', is: 'Long' } },
  { id: '8', operator: 'AND', if: [{ variable: 'Dirt Level', is: 'Low' }, { variable: 'Load Size', is: 'Large' }], then: { variable: 'Cycle Time', is: 'Medium' } },
];

const COLORS = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Small: '#10b981',
  Large: '#ef4444',
  'Very Short': '#06b6d4',
  Short: '#10b981',
  Long: '#ef4444',
};

// --- Components ---

const MembershipPlot = ({ variable, currentValue }: { variable: FuzzyVariable, currentValue?: number }) => {
  const data = useMemo(() => {
    const [min, max] = variable.range;
    const points = 100;
    const step = (max - min) / points;
    const result = [];
    for (let i = 0; i <= points; i++) {
      const x = min + i * step;
      const entry: any = { x };
      variable.membershipFunctions.forEach(mf => {
        entry[mf.name] = getMembership(x, mf);
      });
      result.push(entry);
    }
    return result;
  }, [variable]);

  return (
    <div className="h-full w-full p-2 overflow-hidden flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
          <CartesianGrid strokeDasharray="2 2" vertical={true} stroke="#e5e7eb" />
          <XAxis 
            dataKey="x" 
            fontSize={9} 
            domain={variable.range} 
            type="number" 
            stroke="#94a3b8" 
            tick={{ fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis 
            fontSize={9} 
            domain={[0, 1]} 
            stroke="#94a3b8" 
            tick={{ fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <RechartsTooltip 
            contentStyle={{ 
              borderRadius: '2px', 
              border: '1px solid #cbd5e1', 
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              fontSize: '10px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.95)'
            }}
            labelFormatter={(v) => `${variable.name}: ${Number(v).toFixed(2)} ${variable.unit}`}
          />
          {variable.membershipFunctions.map((mf, idx) => (
            <Area
              key={mf.name}
              type="monotone"
              dataKey={mf.name}
              stroke={(COLORS as any)[mf.name] || '#6366f1'}
              fill={(COLORS as any)[mf.name] || '#6366f1'}
              fillOpacity={0.08}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {currentValue !== undefined && (
            <ReferenceLine
              x={currentValue}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              label={{ 
                value: currentValue.toFixed(1), 
                position: 'top', 
                fontSize: 9, 
                fill: '#ef4444', 
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function App() {
  const [dirtLevel, setDirtLevel] = useState(50);
  const [loadSize, setLoadSize] = useState(5);
  const [activeTab, setActiveTab] = useState('Dirt Level');

  const engine = useMemo(() => new FuzzyEngine(FUZZY_VARIABLES, RULES), []);

  const result = useMemo(() => {
    return engine.compute({ 'Dirt Level': dirtLevel, 'Load Size': loadSize }, 'Cycle Time');
  }, [dirtLevel, loadSize, engine]);

  const activeRulesCount = result.ruleActivations.filter(r => r.activation > 0).length;

  return (
    <div className="h-screen flex flex-col p-3 gap-3 overflow-hidden select-none">
      
      {/* Simulation Window Chrome */}
      <div className="card flex items-center justify-between px-4 py-2 bg-gray-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/20 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20 shadow-inner" />
          </div>
          <h1 className="text-[11px] font-bold text-gray-600 tracking-tight flex items-center gap-2">
            <Waves className="w-3.5 h-3.5 text-blue-500" />
            MATLAB Fuzzy Logic Designer - [Washing_Controller.fis]
          </h1>
        </div>
        <div className="flex gap-4 text-[10px] items-center">
          <span className="text-blue-600 font-medium hover:underline cursor-pointer">Export to Workspace</span>
          <div className="w-px h-3 bg-gray-300" />
          <span className="text-gray-400 font-mono">v2.4.1 [Stable]</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 flex-grow overflow-hidden">
        
        {/* Left Column: Variable Inputs & Engine Props */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <div className="card p-4 flex flex-col min-h-0">
            <h2 className="text-[10px] font-bold mb-4 pb-1 border-b border-gray-100 flex items-center justify-between">
              VARIABLES
              <Settings2 className="w-3 h-3 text-gray-400" />
            </h2>
            <div className="space-y-3 overflow-y-auto pr-1 flex-grow scrollbar-hide">
              {/* Dirt Level Control */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-900">Dirt Level</span>
                  <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded-sm font-bold">Input 1</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={dirtLevel} 
                  onChange={(e) => setDirtLevel(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-blue-100 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-blue-700/70 mt-2 font-mono">
                  <span>0 (Min)</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-600 font-bold">{dirtLevel.toFixed(1)}</span>
                  <span>100 (Max)</span>
                </div>
              </div>

              {/* Load Size Control */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-indigo-900">Load Size</span>
                  <span className="text-[9px] bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded-sm font-bold">Input 2</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="0.1" 
                  value={loadSize} 
                  onChange={(e) => setLoadSize(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-indigo-100 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-indigo-700/70 mt-2 font-mono">
                  <span>0kg (Small)</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-600 font-bold">{loadSize.toFixed(1)}kg</span>
                  <span>10kg (Large)</span>
                </div>
              </div>

              {/* Output Visualization Result */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm mt-4 text-center">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-900">Output Result</span>
                  <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-sm font-bold">Cycle Time</span>
                </div>
                <div className="text-3xl font-mono font-bold text-emerald-700 py-3 tracking-tighter tabular-nums decoration-emerald-300 decoration-dotted underline">
                  {result.value.toFixed(2)}<span className="text-sm font-normal ml-1">min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 shrink-0">
            <h2 className="label-micro mb-3">FIS Engine Properties</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] items-center">
              <span className="text-gray-400 font-medium">Inference:</span>
              <span className="text-gray-900 font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Mamdani</span>
              <span className="text-gray-400 font-medium">Aggregation:</span>
              <span className="text-gray-900 font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">MAX</span>
              <span className="text-gray-400 font-medium">Implication:</span>
              <span className="text-gray-900 font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">MIN</span>
              <span className="text-gray-400 font-medium">Defuzzification:</span>
              <span className="text-gray-900 font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Centroid</span>
            </div>
          </div>
        </div>

        {/* Center Column: Plots & Console Log */}
        <div className="col-span-6 flex flex-col gap-3 min-h-0">
          <div className="card p-4 flex-grow flex flex-col min-h-0 mt-3 relative">
            <div className="absolute -top-3 left-3 flex gap-px">
              {FUZZY_VARIABLES.map(v => (
                <button
                  key={v.name}
                  onClick={() => setActiveTab(v.name)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-bold transition-all border-x border-t rounded-t-sm",
                    activeTab === v.name 
                      ? "bg-white border-gray-300 text-blue-600 -translate-y-0.5 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]" 
                      : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {v.name.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="flex-grow flex flex-col min-h-0 pt-2">
              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <h2 className="text-xs font-bold text-gray-700">MEMBERSHIP FUNCTION PLOT</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    {FUZZY_VARIABLES.find(v => v.name === activeTab)?.membershipFunctions.map(mf => (
                      <div key={mf.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm border border-black/5" style={{ backgroundColor: (COLORS as any)[mf.name] || '#6366f1' }} />
                        <span className="text-[9px] text-gray-500 font-bold">{mf.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-grow min-h-0 bg-gray-50/50 border border-gray-100 rounded-sm">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full w-full"
                  >
                    <MembershipPlot 
                      variable={FUZZY_VARIABLES.find(v => v.name === activeTab)!} 
                      currentValue={activeTab === 'Dirt Level' ? dirtLevel : activeTab === 'Load Size' ? loadSize : result.value}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Console / Log Terminal */}
          <div className="card bg-gray-900 border-gray-800 p-3 h-28 shrink-0 flex flex-col overflow-hidden font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-1 mb-1.5">
              <span className="text-gray-500 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                <FileCode2 className="w-2.5 h-2.5" />
                Inference Trace
              </span>
              <span className="text-green-500/50">LIVE</span>
            </div>
            <div className="space-y-0.5 overflow-hidden text-green-400/80">
              <div className="opacity-50">[{new Date().toTimeString().split(' ')[0]}] FIS engine core initialized...</div>
              <div className="opacity-70">[{new Date().toTimeString().split(' ')[0]}] Mamdani computation active.</div>
              <div>[{new Date().toTimeString().split(' ')[0]}] Defuzzification calculated: <span className="text-green-400 font-bold">{result.value.toFixed(6)}</span></div>
              <div className="text-yellow-400/80">[{new Date().toTimeString().split(' ')[0]}] Waiting for continuous input stream...</div>
              <div className="animate-pulse">_</div>
            </div>
          </div>
        </div>

        {/* Right Column: Rule Viewer & Status */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <div className="card p-4 flex flex-col min-h-0">
            <h2 className="text-[10px] font-bold mb-3 border-b border-gray-50 pb-2 flex items-center justify-between">
              RULE VIEWER
              <Zap className="w-3 h-3 text-orange-400" />
            </h2>
            <div className="flex-grow overflow-y-auto pr-1 border border-gray-200 rounded-sm bg-gray-50/30 scrollbar-hide">
              {RULES.map((rule, idx) => {
                const activation = result.ruleActivations.find(ra => ra.ruleId === rule.id)?.activation || 0;
                return (
                  <div 
                    key={rule.id}
                    className={cn(
                      "group border-b border-gray-200/50 transition-all font-mono py-1.5 px-2 flex flex-col gap-0.5",
                      activation > 0 ? "bg-blue-50 border-blue-100" : "opacity-40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400">#{(idx + 1).toString().padStart(2, '0')}</span>
                      {activation > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1 rounded-sm">FIRE: {activation.toFixed(2)}</span>}
                    </div>
                    <div className="text-[10px] text-gray-700 leading-tight">
                      <span className="text-blue-700 font-bold italic">IF</span> 
                      {rule.if.map((c, i) => (
                        <span key={i}> ({c.variable} is <span className="text-orange-600 underline font-bold tracking-tight">{c.is}</span>){i < rule.if.length - 1 ? <span className="text-blue-800"> AND </span> : ''}</span>
                      ))}
                      <span className="text-blue-700 font-bold italic"> THEN</span> (<span className="text-emerald-700 font-bold">{rule.then.is}</span>)
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1.5 rounded-sm transition-all active:scale-95">EXPORT RULES</button>
              <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 font-bold text-[10px] py-1.5 rounded-sm transition-all active:scale-95">CLEAR LOGS</button>
            </div>
          </div>

          <div className="card p-4 shrink-0">
            <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
              <span className="label-micro">System Diagnosis</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-green-600">SYNCC</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Rules Active:</span>
                <span className="font-bold text-blue-600">{activeRulesCount} of {RULES.length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Compute Speed:</span>
                <span className="font-mono bg-gray-50 px-1 border border-gray-100 rounded">0.0004s</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Accuracy Rank:</span>
                <span className="font-bold text-gray-600">High Resolution</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
