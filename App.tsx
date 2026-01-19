
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Users, 
  FileText, 
  Search, 
  Download, 
  Upload,
  Shield, 
  Sparkles,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  BrainCircuit,
  Database,
  BarChart3,
  Terminal
} from 'lucide-react';
import { MOCK_DISTRICT_DATA, SUBSIDY_PER_CHILD } from './constants';
import { DistrictData, StateSummary, AggregatedStats } from './types';
import { getAuditAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [data, setData] = useState<DistrictData[]>(MOCK_DISTRICT_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [riskThreshold, setRiskThreshold] = useState(0.4);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  
  // ML Pipeline States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [mlLogs, setMlLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // REPLICATING YOUR PYTHON ML MODEL LOGIC
  const runRealPythonPipeline = async (file: File) => {
    setIsProcessing(true);
    setMlLogs(["🚀 Uploading dataset to ZeroPrint Engine (Python)..."]);
    setProgress(10);
    setProcessStep('Uploading & Handshaking...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // VISUALS: Show progress while waiting for server
      setTimeout(() => setProgress(30), 500);
      setMlLogs(prev => [...prev, "📡 Sending data to localhost:5000/analyze..."]);
      
      // THE REAL API CALL
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        body: formData,
      });

      setProcessStep('Server Processing (Random Forest)...');
      setProgress(60);

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Integrate Python Logs
      if (result.logs) {
        setMlLogs(prev => [...prev, ...result.logs]);
      }
      
      setProcessStep('Rendering Analytics...');
      setProgress(90);
      
      // Update the Dashboard Data with Real Results
      if (result.data) {
        setData(result.data);
      }
      
      setMlLogs(prev => [...prev, "✅ Integration Successful: Pipeline Complete"]);
      setProgress(100);

    } catch (error) {
      console.error(error);
      setMlLogs(prev => [...prev, "❌ ERROR: Could not connect to Python backend.", "Ensure app.py is running on port 5000"]);
      setProcessStep('Connection Failed');
    } finally {
      // Allow user to see the success state briefly before closing
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Call the new backend function instead of the simulation
    runRealPythonPipeline(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const totalStats = useMemo((): AggregatedStats => {
    const filteredData = data.filter(d => 
      d.ghost_risk_score >= riskThreshold &&
      (selectedState === 'ALL' || d.state === selectedState) &&
      (d.district.toLowerCase().includes(searchTerm.toLowerCase()) || 
       d.state.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => b.ghost_risk_score - a.ghost_risk_score);

    const totalGhosts = filteredData.reduce((sum, d) => sum + d.total_ghost_children, 0);
    const totalLeakage = totalGhosts * SUBSIDY_PER_CHILD;
    const totalDistricts = filteredData.length;
    const totalPincodes = filteredData.reduce((sum, d) => sum + d.suspicious_pincodes, 0);

    return { totalGhosts, totalLeakage, totalDistricts, totalPincodes, filteredData };
  }, [data, searchTerm, selectedState, riskThreshold]);

  const stateRiskMap = useMemo(() => {
    const summary: Record<string, StateSummary> = {};
    data.forEach(d => {
      if (!summary[d.state]) {
        summary[d.state] = { totalGhosts: 0, avgRisk: 0, count: 0 };
      }
      summary[d.state].totalGhosts += d.total_ghost_children;
      summary[d.state].avgRisk += d.ghost_risk_score;
      summary[d.state].count += 1;
    });
    
    Object.keys(summary).forEach(state => {
      summary[state].avgRisk = summary[state].avgRisk / summary[state].count;
    });
    
    return summary;
  }, [data]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const insight = await getAuditAnalysis(totalStats.filteredData);
    setAiInsight(insight || "No specific patterns detected in current view.");
    setIsAnalyzing(false);
  };

  const getStateColor = useCallback((stateName: string) => {
    const dataRef = stateRiskMap[stateName];
    if (!dataRef) return '#1e293b';
    
    const risk = dataRef.avgRisk;
    if (risk >= 0.80) return '#ef4444';
    if (risk >= 0.50) return '#f97316';
    if (risk >= 0.30) return '#eab308';
    return '#22c55e';
  }, [stateRiskMap]);

  const states = ['ALL', ...new Set(data.map(d => d.state))].sort();

  const getRiskColorClass = (score: number) => {
    if (score >= 0.90) return 'bg-red-500';
    if (score >= 0.70) return 'bg-orange-500';
    if (score >= 0.40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      {/* ML RUNTIME OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-2xl">
          <div className="max-w-2xl w-full p-8 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                <BrainCircuit className="w-12 h-12 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">ZeroPrint Audit Engine</h2>
                <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest">{processStep}</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 font-mono text-[11px] h-64 overflow-y-auto space-y-1 shadow-inner">
              {mlLogs.map((log, i) => (
                <div key={i} className={`${log.startsWith('✅') ? 'text-emerald-400' : log.startsWith('🚨') ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                  <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))}
              <div className="w-1 h-3 bg-indigo-500 inline-block animate-pulse ml-1" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                <span>Feature Extraction</span>
                <span>{progress}% Inference</span>
                <span>Fiscal Impacting</span>
              </div>
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500 ease-out shadow-[0_0_20px_rgba(99,102,241,0.6)]" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent uppercase">
                VigilAadhaar
              </h1>
              <p className="text-slate-400 font-medium tracking-wide">ZeroPrint Lifecycle Analysis &bull; v5.0 Active</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <button
              onClick={triggerUpload}
              className="group flex items-center gap-3 bg-slate-100 hover:bg-white text-slate-900 px-6 py-3 rounded-2xl transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] font-black text-xs uppercase tracking-widest"
            >
              <Database className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              Upload Raw ML Set
            </button>
            <button
              onClick={handleAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl transition-all shadow-lg disabled:opacity-50 font-black text-xs uppercase tracking-widest"
            >
              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Strategy
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Ghost Gap Identified', val: totalStats.totalGhosts.toLocaleString('en-IN'), sub: 'Calculated (Enrol - Bio)', icon: Users, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Estimated Leakage', val: `₹${(totalStats.totalLeakage / 10000000).toFixed(2)} Cr`, sub: '₹6k subsidy/child/yr', icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Suspicious Hotspots', val: totalStats.totalDistricts, sub: 'High risk districts', icon: MapPin, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'ML Target Pincodes', val: totalStats.totalPincodes, sub: 'Audit-ready locations', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-500/50 transition-all border-b-4 border-b-transparent hover:border-b-indigo-500">
              <div className="relative z-10">
                <div className={`p-3 w-fit rounded-xl ${stat.bg} ${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black mb-1 tracking-tight">{stat.val}</div>
                <div className="text-slate-400 text-xs font-black uppercase tracking-widest">{stat.label}</div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium italic">{stat.sub}</div>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <stat.icon className="w-24 h-24" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Model Search</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter by jurisdiction..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">State Node</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                  >
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    Inference Sensitivity: {(riskThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-4"
                  />
                </div>
              </div>
            </div>

            {aiInsight && (
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BrainCircuit className="w-16 h-16 text-indigo-500" />
                </div>
                <h3 className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-[0.2em] mb-4">
                  <Sparkles className="w-4 h-4" />
                  Gemini Audit Strategy
                </h3>
                <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-line relative z-10 font-medium">
                  {aiInsight}
                </div>
              </div>
            )}

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/20">
              <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/30">
                <div className="flex items-center gap-3">
                   <h2 className="text-lg font-black uppercase tracking-tight">Audit Prioritization Engine</h2>
                   <span className="flex items-center gap-1 text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-500/20">
                     <BarChart3 className="w-3 h-3" />
                     Live Feature Map
                   </span>
                </div>
                <span className="text-[10px] bg-red-500/10 text-red-400 font-black px-3 py-1 rounded-full border border-red-500/20 uppercase tracking-widest">
                  {totalStats.filteredData.length} Anomalies
                </span>
              </div>
              <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-500 uppercase tracking-widest text-[9px] sticky top-0 z-10 font-black">
                      <th className="px-6 py-4">District / State</th>
                      <th className="px-6 py-4 text-center">Risk Vector</th>
                      <th className="px-6 py-4 text-right">Ghost Gap</th>
                      <th className="px-6 py-4 text-right">Annual Impact</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {totalStats.filteredData.map((d, i) => (
                      <tr key={`${d.state}-${d.district}-${i}`} className="hover:bg-slate-700/20 transition-all group">
                        <td className="px-6 py-4">
                          <div className="font-black text-white group-hover:text-indigo-400 transition-colors">{d.district}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-black tracking-tighter opacity-60">{d.state}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-full max-w-[100px] bg-slate-900 h-1 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full ${getRiskColorClass(d.ghost_risk_score)} shadow-[0_0_10px_rgba(239,68,68,0.3)]`} 
                                style={{ width: `${d.ghost_risk_score * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-[9px] font-black text-slate-400">{(d.ghost_risk_score * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-black text-red-400">{d.total_ghost_children.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-slate-500 uppercase font-black tracking-tighter opacity-60">ML Flags</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-black text-amber-500">₹{((d.total_ghost_children * SUBSIDY_PER_CHILD) / 100000).toFixed(1)}L</div>
                          <div className="text-[9px] text-slate-500 uppercase font-black tracking-tighter opacity-60">Leakage</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 bg-slate-900 border border-slate-700 hover:border-indigo-500 hover:text-indigo-400 rounded-lg text-slate-500 transition-all">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Geospatial Hotspots
              </h3>
              
              <div className="relative aspect-[3/4] bg-slate-950/50 rounded-2xl p-4 flex items-center justify-center overflow-hidden border border-white/5">
                 <svg viewBox="0 0 800 900" className="w-full h-full drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                    <path
                      d="M 280 80 L 320 60 L 360 70 L 380 100 L 370 130 L 340 140 L 300 120 Z"
                      fill={getStateColor("Jammu and Kashmir")}
                      className="cursor-pointer transition-all hover:scale-[1.05] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Jammu and Kashmir")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Jammu and Kashmir")}
                    />
                    <path
                      d="M 270 140 L 310 150 L 320 180 L 300 200 L 260 190 Z"
                      fill={getStateColor("Punjab")}
                      className="cursor-pointer transition-all hover:scale-[1.05] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Punjab")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Punjab")}
                    />
                    <path
                      d="M 320 200 L 380 210 L 420 240 L 440 280 L 420 310 L 380 320 L 340 300 L 310 260 Z"
                      fill={getStateColor("Uttar Pradesh")}
                      className="cursor-pointer transition-all hover:scale-[1.05] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Uttar Pradesh")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Uttar Pradesh")}
                    />
                    <path
                      d="M 440 290 L 480 300 L 500 330 L 480 360 L 440 350 L 420 320 Z"
                      fill={getStateColor("Bihar")}
                      className="cursor-pointer transition-all hover:scale-[1.05] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Bihar")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Bihar")}
                    />
                     <path
                      d="M 480 360 L 520 370 L 540 400 L 530 440 L 500 450 L 470 420 L 460 380 Z"
                      fill={getStateColor("West Bengal")}
                      className="cursor-pointer transition-all hover:scale-[1.05] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("West Bengal")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("West Bengal")}
                    />
                 </svg>

                 {hoveredState && stateRiskMap[hoveredState] && (
                    <div className="absolute top-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl animate-in zoom-in-95 z-20">
                       <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-white uppercase tracking-widest text-[10px]">{hoveredState}</span>
                        <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md font-black">{(stateRiskMap[hoveredState].avgRisk * 100).toFixed(1)}% RISK</span>
                       </div>
                       <div className="text-[9px] text-slate-500 flex justify-between uppercase font-black tracking-tighter">
                        <span>{stateRiskMap[hoveredState].totalGhosts.toLocaleString('en-IN')} flags</span>
                        <span>{stateRiskMap[hoveredState].count} Nodes</span>
                       </div>
                    </div>
                 )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {[
                  { label: 'Critical', color: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' },
                  { label: 'High', color: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' },
                  { label: 'Mod', color: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' },
                  { label: 'Low', color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    <div className={`w-2 h-2 rounded-full ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-3 text-red-400 font-black uppercase tracking-[0.2em] text-[10px]">
                <AlertTriangle className="w-5 h-5" />
                Audit System Pulse
              </div>
              <p className="text-slate-300 text-xs leading-relaxed font-medium">
                <span className="text-red-400 font-black">WARNING:</span> ZeroPrint detected critical biometric update gaps. 
                Pincode compliance is <span className="text-red-400 font-black underline">below 12%</span> in several northern clusters.
              </p>
              <button className="w-full flex items-center justify-between bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-4 py-3 rounded-xl transition-all group">
                <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">Run Verification</span>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                <TrendingUp className="w-20 h-20 text-indigo-500" />
               </div>
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <Terminal className="w-4 h-4 text-indigo-500" />
                 Top Fraud Jurisdictions
               </h3>
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {(Object.entries(stateRiskMap) as [string, StateSummary][])
                  .sort((a,b) => b[1].totalGhosts - a[1].totalGhosts)
                  .slice(0, 10)
                  .map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-2xl hover:bg-slate-900 transition-all border border-transparent hover:border-slate-700 cursor-pointer group" onClick={() => setSelectedState(name)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-6 rounded-full ${data.avgRisk > 0.6 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`} />
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-tighter group-hover:text-white transition-colors">{name}</div>
                          <div className="text-[9px] text-slate-500 font-mono font-bold tracking-tight">{data.totalGhosts.toLocaleString('en-IN')} Flags Identified</div>
                        </div>
                      </div>
                      <div className="text-[9px] font-black text-slate-400 flex flex-col items-end opacity-80 group-hover:opacity-100">
                        <span>#{(data.avgRisk * 100).toFixed(0)} SCORE</span>
                        <span className="text-slate-600 font-mono">{data.count} Dist.</span>
                      </div>
                    </div>
                  ))
                 }
               </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 py-8 border-t border-slate-800 flex flex-col items-center gap-4 text-slate-600">
          <div className="flex items-center gap-6">
            <span className="uppercase tracking-[0.3em] font-black text-[9px]">UIDAI Hackathon 2026</span>
            <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
            <span className="uppercase tracking-[0.3em] font-black text-[9px] text-indigo-500/60">ZeroPrint Protocol v5.1.4</span>
          </div>
          <p className="text-center opacity-40 font-bold text-[8px] uppercase tracking-widest max-w-2xl leading-relaxed">
            Confidential - Authorized Government Personnel Only. 
            Real-time Random Forest Inference running on Aadhaar Lifecycle Metadata.
            All model predictions are probabilistic and subject to field verification.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
