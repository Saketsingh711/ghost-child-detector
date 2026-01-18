
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
  ExternalLink
} from 'lucide-react';
import { MOCK_DISTRICT_DATA, SUBSIDY_PER_CHILD } from './constants';
import { DistrictData, StateSummary, AggregatedStats } from './types';
import { getAuditAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [data, setData] = useState<DistrictData[]>(MOCK_DISTRICT_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [riskThreshold, setRiskThreshold] = useState(0.5);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Parsing Logic
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newDistricts: DistrictData[] = [];

      // Skip header, iterate through lines
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        // Basic validation: ensure we have enough columns and the first isn't the noise '100000'
        if (cols.length >= 5 && cols[0] !== '100000' && cols[0] !== 'state') {
          newDistricts.push({
            state: cols[0].trim(),
            district: cols[1].trim(),
            ghost_risk_score: parseFloat(cols[2]) || 0,
            total_ghost_children: parseFloat(cols[3]) || 0,
            suspicious_pincodes: parseInt(cols[4]) || 0,
          });
        }
      }

      if (newDistricts.length > 0) {
        setData(newDistricts);
        setAiInsight(null); // Clear old insights when data changes
        setSelectedState('ALL');
        console.log(`Successfully uploaded ${newDistricts.length} districts.`);
      } else {
        alert("Could not find valid data rows in the CSV. Please ensure the format matches: state,district,risk,count,pincodes");
      }
    };
    reader.readAsText(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Memoized filtered and aggregated statistics
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

  // Map state level aggregation
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

  const exportData = () => {
    const csvContent = [
      ['Rank', 'State', 'District', 'Risk Score', 'Ghost Count', 'Pincodes', 'Leakage (INR)'],
      ...totalStats.filteredData.map((d, i) => [
        i + 1,
        d.state,
        d.district,
        (d.ghost_risk_score * 100).toFixed(2) + '%',
        d.total_ghost_children,
        d.suspicious_pincodes,
        (d.total_ghost_children * SUBSIDY_PER_CHILD)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VigilAadhaar_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
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
              <p className="text-slate-400 font-medium tracking-wide">Project ZeroPrint &bull; Ghost-Child Audit Dashboard</p>
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
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg"
            >
              <Upload className="w-4 h-4" />
              Upload ML Output
            </button>
            <button
              onClick={handleAiAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAnalyzing ? "Analyzing..." : "AI Strategy Audit"}
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-2.5 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              CSV Report
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Ghost Children Detected', val: totalStats.totalGhosts.toLocaleString('en-IN'), sub: 'Total flagged records', icon: Users, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Fiscal Leakage (Annual)', val: `₹${(totalStats.totalLeakage / 10000000).toFixed(2)} Cr`, sub: 'Estimated subsidy loss', icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'High-Risk Districts', val: totalStats.totalDistricts, sub: 'Above threshold', icon: MapPin, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Field Audit Targets', val: totalStats.totalPincodes, sub: 'Suspicious Pincodes', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-500/50 transition-all">
              <div className="relative z-10">
                <div className={`p-3 w-fit rounded-xl ${stat.bg} ${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.val}</div>
                <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
                <div className="text-xs text-slate-500 mt-2">{stat.sub}</div>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-5">
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Geographic Filter</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search district..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-red-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">State Jurisdictions</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 transition-all outline-none appearance-none"
                  >
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Risk Floor: {(riskThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-red-500 mt-4"
                  />
                </div>
              </div>
            </div>

            {aiInsight && (
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <Sparkles className="w-12 h-12 text-indigo-500/20" />
                </div>
                <h3 className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-widest mb-4">
                  <Sparkles className="w-4 h-4" />
                  Gemini Audit Intelligence
                </h3>
                <div className="text-slate-300 leading-relaxed space-y-4 whitespace-pre-line">
                  {aiInsight}
                </div>
              </div>
            )}

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-xl font-bold">Priority Audit List</h2>
                <span className="text-xs bg-red-500/20 text-red-400 font-bold px-3 py-1 rounded-full border border-red-500/20">
                  {totalStats.filteredData.length} Districts Flagged
                </span>
              </div>
              <div className="max-h-[800px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-500 uppercase tracking-tighter text-xs sticky top-0 z-10">
                      <th className="px-6 py-4 font-bold">Region</th>
                      <th className="px-6 py-4 font-bold text-center">Risk Vector</th>
                      <th className="px-6 py-4 font-bold text-right">Population</th>
                      <th className="px-6 py-4 font-bold text-right">Impact</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {totalStats.filteredData.map((d, i) => (
                      <tr key={`${d.state}-${d.district}-${i}`} className="hover:bg-slate-700/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{d.district}</div>
                          <div className="text-xs text-slate-500">{d.state}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-full max-w-[120px] bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${getRiskColorClass(d.ghost_risk_score)}`} 
                                style={{ width: `${d.ghost_risk_score * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold">{(d.ghost_risk_score * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-red-400">{d.total_ghost_children.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-500">suspected entries</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-orange-400">₹{((d.total_ghost_children * SUBSIDY_PER_CHILD) / 100000).toFixed(1)}L</div>
                          <div className="text-[10px] text-slate-500">yearly leakage</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-white transition-colors">
                            <ExternalLink className="w-4 h-4 ml-auto" />
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
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Fraud Heatmap (India)
              </h3>
              
              <div className="relative aspect-[3/4] bg-slate-950/50 rounded-2xl p-4 flex items-center justify-center overflow-hidden">
                 <svg viewBox="0 0 800 900" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    <path
                      d="M 280 80 L 320 60 L 360 70 L 380 100 L 370 130 L 340 140 L 300 120 Z"
                      fill={getStateColor("Jammu and Kashmir")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Jammu and Kashmir")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Jammu and Kashmir")}
                    />
                    <path
                      d="M 270 140 L 310 150 L 320 180 L 300 200 L 260 190 Z"
                      fill={getStateColor("Punjab")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Punjab")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Punjab")}
                    />
                    <path
                      d="M 320 200 L 380 210 L 420 240 L 440 280 L 420 310 L 380 320 L 340 300 L 310 260 Z"
                      fill={getStateColor("Uttar Pradesh")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Uttar Pradesh")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Uttar Pradesh")}
                    />
                    <path
                      d="M 440 290 L 480 300 L 500 330 L 480 360 L 440 350 L 420 320 Z"
                      fill={getStateColor("Bihar")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Bihar")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Bihar")}
                    />
                     <path
                      d="M 480 360 L 520 370 L 540 400 L 530 440 L 500 450 L 470 420 L 460 380 Z"
                      fill={getStateColor("West Bengal")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("West Bengal")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("West Bengal")}
                    />
                    <path
                      d="M 180 200 L 250 220 L 280 260 L 270 310 L 230 330 L 180 310 L 150 270 L 160 230 Z"
                      fill={getStateColor("Rajasthan")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Rajasthan")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Rajasthan")}
                    />
                     <path
                      d="M 240 430 L 300 440 L 340 480 L 350 530 L 320 560 L 270 550 L 230 520 L 220 470 Z"
                      fill={getStateColor("Maharashtra")}
                      className="cursor-pointer transition-all hover:scale-[1.02] stroke-[#0f172a] stroke-2"
                      onMouseEnter={() => setHoveredState("Maharashtra")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState("Maharashtra")}
                    />
                 </svg>

                 {hoveredState && stateRiskMap[hoveredState] && (
                    <div className="absolute top-4 left-4 right-4 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 z-20">
                       <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">{hoveredState}</span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md">{(stateRiskMap[hoveredState].avgRisk * 100).toFixed(1)}% Risk</span>
                       </div>
                       <div className="text-[10px] text-slate-500 flex justify-between uppercase font-bold tracking-tight">
                        <span>{stateRiskMap[hoveredState].totalGhosts.toLocaleString('en-IN')} ghosts</span>
                        <span>{stateRiskMap[hoveredState].count} Districts</span>
                       </div>
                    </div>
                 )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {[
                  { label: 'Critical', color: 'bg-red-500' },
                  { label: 'High', color: 'bg-orange-500' },
                  { label: 'Moderate', color: 'bg-yellow-500' },
                  { label: 'Low', color: 'bg-green-500' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div className={`w-3 h-3 rounded-full ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-400 font-bold uppercase tracking-widest text-xs">
                <AlertTriangle className="w-5 h-5" />
                Audit System Alert
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Significant model-detected anomalies in <span className="text-red-400 font-bold">Uttar Pradesh</span> and <span className="text-red-400 font-bold">West Bengal</span>. 
                Risk scores in Kushi Nagar and Nuh exceed 99.8%.
              </p>
              <button className="w-full flex items-center justify-between bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-4 py-3 rounded-xl transition-all group">
                <span className="text-red-400 text-xs font-bold uppercase">View Alert Details</span>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Top Jurisdictions</h3>
               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                 {(Object.entries(stateRiskMap) as [string, StateSummary][])
                  .sort((a,b) => b[1].totalGhosts - a[1].totalGhosts)
                  .slice(0, 10)
                  .map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-2xl hover:bg-slate-900 transition-all border border-transparent hover:border-slate-700 cursor-pointer" onClick={() => setSelectedState(name)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStateColor(name) === '#ef4444' ? 'bg-red-500' : 'bg-orange-500'}`} />
                        <div>
                          <div className="text-xs font-bold">{name}</div>
                          <div className="text-[10px] text-slate-500">{data.totalGhosts.toLocaleString('en-IN')} ghosts</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-slate-400">#{(data.avgRisk * 100).toFixed(0)}</div>
                    </div>
                  ))
                 }
               </div>
            </div>
          </div>
        </div>

        <footer className="mt-12 py-8 border-t border-slate-800 flex flex-col items-center gap-4 text-slate-500 text-xs">
          <div className="flex items-center gap-6">
            <span className="uppercase tracking-widest font-bold">UIDAI Hackathon 2026</span>
            <span className="uppercase tracking-widest font-bold opacity-30">|</span>
            <span className="uppercase tracking-widest font-bold">ZeroPrint Protocol v4.2</span>
          </div>
          <p className="text-center opacity-60">
            Confidential - Authorized Government Personnel Only. 
            Data reflects ML Model Predictions as of {new Date().toLocaleDateString()}.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
