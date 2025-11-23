import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  Settings, Activity, Zap, Sliders, RefreshCw, Info, Cpu, ArrowRight,
  CheckCircle, AlertTriangle, TrendingDown, BrainCircuit, Grid, Crosshair, Divide
} from 'lucide-react';

// --- MATH & DSP UTILS ---

const PI = Math.PI;
const log10 = (x) => Math.log(x) / Math.LN10;
const toDeg = (rad) => (rad * 180) / Math.PI;

// Complex Number Helper
const complex = (re, im) => ({ re, im });
const cAdd = (a, b) => complex(a.re + b.re, a.im + b.im);
const cMul = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cMag = (z) => Math.sqrt(z.re * z.re + z.im * z.im);

// --- FIR WINDOW FUNCTIONS ---
const windows = {
  rectangular: (n, N) => 1,
  hamming: (n, N) => 0.54 - 0.46 * Math.cos((2 * PI * n) / (N - 1)),
  hanning: (n, N) => 0.5 * (1 - Math.cos((2 * PI * n) / (N - 1))),
  blackman: (n, N) => 0.42 - 0.5 * Math.cos((2 * PI * n) / (N - 1)) + 0.08 * Math.cos((4 * PI * n) / (N - 1)),
};

// --- FILTER ALGORITHMS ---

// 1. Digital FIR Design (Windowed Sinc)
const designFIR = (taps, cutoffFreq, sampleRate, windowType, type) => {
  const h = [];
  const N = taps;
  const fc = cutoffFreq / sampleRate; // Normalized cutoff
  const center = (N - 1) / 2;
  const winFunc = windows[windowType] || windows.hamming;

  for (let n = 0; n < N; n++) {
    let val = 0;
    if (n === center) {
      val = 2 * fc;
    } else {
      val = Math.sin(2 * PI * fc * (n - center)) / (PI * (n - center));
    }
    
    // Windowing
    val *= winFunc(n, N);

    // Spectral Inversion for High Pass / Band Stop
    if (type === 'highpass') {
      if (n === center) val = 1 - val;
      else val = -val;
    }
    
    h.push(val);
  }
  return h;
};

// 2. Analog/IIR Magnitude Response (Approximations for Visualization)
const calculateIIRMag = (f, fc, n, type, topo, ripple) => {
  let mag = 0;
  let w = f / fc; // Normalized freq ratio
  
  // Frequency transformation for types
  if (type === 'highpass') w = 1/w;
  if (type === 'bandpass') w = Math.abs(w - 1/w); // Simple Q transform approx
  if (type === 'notch') w = Math.abs(1 / (w - 1/w)); // Inverse BP

  switch (topo) {
    case 'butterworth':
      mag = 1 / Math.sqrt(1 + Math.pow(w, 2 * n));
      break;
    case 'chebyshev1':
      const eps = Math.sqrt(Math.pow(10, ripple/10) - 1);
      const cn = w <= 1 ? Math.cos(n * Math.acos(w)) : Math.cosh(n * Math.acosh(w));
      mag = 1 / Math.sqrt(1 + Math.pow(eps * cn, 2));
      break;
    case 'chebyshev2': // Inverse Chebyshev (ripple in stopband)
      const eps2 = 0.1; // simplified stopband ripple factor
      const Tn = w <= 1 ? Math.cos(n * Math.acos(1/w)) : Math.cosh(n * Math.acosh(1/w));
      mag = 1 / Math.sqrt(1 + 1 / (Math.pow(eps2 * Tn, 2)));
      break;
    case 'bessel': // Group delay optimized
      mag = 1 / Math.sqrt(1 + Math.pow(w, 2 * n) * 0.3 + Math.pow(w, 2)); // Heuristic
      break;
    case 'elliptic': // Ripple in both
       const epsE = Math.sqrt(Math.pow(10, ripple/10) - 1);
       const oscillation = Math.cos(n * w * 3); 
       mag = w < 1 
        ? 1 / Math.sqrt(1 + Math.pow(epsE * Math.cos(n * Math.acos(w)), 2))
        : (1 / (Math.pow(w, 2*n) * epsE)) * (1 + 0.1 * oscillation);
       break;
    default: mag = 0;
  }
  return mag;
};

// 3. Pole-Zero Generator (Visual approximation of z-plane/s-plane roots)
const calculatePolesZeros = (topo, n, type, domain) => {
  const poles = [];
  const zeros = [];
  
  // Zeros
  if (type === 'highpass' || type === 'bandpass') {
     // Highpass often has zeros at 0 (z-plane) or origin (s-plane)
     for(let i=0; i<n; i++) zeros.push({x: 0, y: 0});
  }

  // Poles
  for (let k = 0; k < n; k++) {
    const angle = (PI * (2 * k + n + 1)) / (2 * n);
    
    if (domain === 'digital_fir') {
       // FIR: All poles at origin (stable)
       poles.push({x:0, y:0});
    } else if (domain === 'analog') {
      // S-Plane: Left Half Plane
      let radius = 1; // Normalized
      if (topo === 'chebyshev1') {
        // Ellipse
        poles.push({
           x: 0.5 * Math.cos(angle), // Squashed circle
           y: 1.0 * Math.sin(angle)
        });
      } else {
        // Butterworth: Circle
        poles.push({ x: Math.cos(angle), y: Math.sin(angle) });
      }
    } else {
      // Z-Plane: Inside Unit Circle
      // Map s-plane to z-plane via bilinear transform approx s = (z-1)/(z+1)
      // Or just place them geometrically for visualization
      const r = topo === 'butterworth' ? 0.7 : 0.85; 
      poles.push({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle)
      });
    }
  }
  
  // FIR Zeros spread around unit circle
  if (domain === 'digital_fir') {
    for(let i=0; i<n; i++) zeros.push({ 
       x: Math.cos(2*PI*i/n), 
       y: Math.sin(2*PI*i/n) 
    });
  }

  return { poles, zeros };
};

export default function FilterLabPro() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('design'); // design, analysis, adaptive
  
  // Core Specs
  const [domain, setDomain] = useState('analog'); // analog, digital_iir, digital_fir
  const [filterType, setFilterType] = useState('lowpass');
  const [topology, setTopology] = useState('butterworth');
  const [windowType, setWindowType] = useState('hamming');
  
  // Parameters
  const [cutoff, setCutoff] = useState(1000);
  const [order, setOrder] = useState(4);
  const [ripple, setRipple] = useState(1);
  const [sampleRate, setSampleRate] = useState(48000);
  const [taps, setTaps] = useState(31); // For FIR

  // Adaptive
  const [adaptiveAlgo, setAdaptiveAlgo] = useState('lms'); // lms, nlms, rls, kalman
  const [mu, setMu] = useState(0.01);
  const [isRunning, setIsRunning] = useState(true);

  // --- ENGINE: FREQUENCY & TIME DOMAIN CALCULATION ---
  const analysisData = useMemo(() => {
    const freqData = [];
    const impulseData = [];
    const stepData = [];
    const numPoints = 128;
    
    // 1. Calculate Coefficients / Impulse Response (h[n])
    let h = [];
    if (domain === 'digital_fir') {
      h = designFIR(taps, cutoff, sampleRate, windowType, filterType);
    } else {
      // For IIR/Analog, we simulate an Impulse Response for visualization
      // Simple decay sinusoid based on order
      for(let i=0; i<64; i++) {
        const decay = Math.exp(-i/(order*2));
        const osc = Math.sin(2*PI*i * (cutoff/sampleRate));
        h.push(decay * osc);
      }
    }

    // 2. Frequency Domain (FFT approximation or Analytical)
    const maxFreq = domain === 'analog' ? cutoff * 10 : sampleRate / 2;
    const minFreq = 10;
    
    for (let i = 0; i < numPoints; i++) {
      // Log distribution for Bode
      const f = minFreq * Math.pow(maxFreq / minFreq, i / (numPoints - 1));
      let magDB = -100;
      let phase = 0;
      let groupDelay = 0;

      if (domain === 'digital_fir') {
        // DFT for FIR
        let re = 0, im = 0;
        const w = 2 * PI * f / sampleRate;
        for(let n=0; n<h.length; n++) {
          re += h[n] * Math.cos(n * w);
          im -= h[n] * Math.sin(n * w);
        }
        const mag = Math.sqrt(re*re + im*im);
        magDB = 20 * log10(mag + 1e-9);
        phase = toDeg(Math.atan2(im, re));
        // Group delay for linear phase FIR = (N-1)/2
        groupDelay = (taps - 1) / 2; 
      } else {
        // Analytical IIR/Analog
        const mag = calculateIIRMag(f, cutoff, order, filterType, topology, ripple);
        magDB = 20 * log10(mag + 1e-9);
        
        // Phase Model
        const phi = -Math.atan(Math.pow(f/cutoff, order));
        if (topology === 'bessel') {
            phase = toDeg(-f/cutoff * PI/2 * order); // Linear Phase
            groupDelay = order; // Constant
        } else {
            phase = toDeg(phi * order);
            // Derivative of atan(x^n) approx for Group Delay spike at fc
            const ratio = f/cutoff;
            groupDelay = order / (1 + Math.pow(ratio, 2*order)); 
        }
      }

      freqData.push({
        f: Math.round(f),
        mag: Math.max(-120, magDB),
        phase: phase % 180,
        groupDelay: groupDelay
      });
    }

    // 3. Time Domain (Impulse & Step)
    let stepAccumulator = 0;
    for(let i=0; i<Math.min(h.length, 60); i++) {
       stepAccumulator += h[i];
       impulseData.push({ n: i, val: h[i] });
       stepData.push({ n: i, val: stepAccumulator });
    }

    return { freqData, impulseData, stepData, coeffs: h };
  }, [domain, filterType, topology, cutoff, order, ripple, sampleRate, taps, windowType]);

  // --- ENGINE: POLE-ZERO ---
  const poleZeroData = useMemo(() => {
    return calculatePolesZeros(topology, order, filterType, domain);
  }, [topology, order, filterType, domain]);

  // --- ENGINE: ADAPTIVE SIMULATION ---
  const adaptiveData = useMemo(() => {
    if (!isRunning) return [];
    const data = [];
    const N = 150;
    
    // State for algorithms
    let w = new Array(8).fill(0); // Weights
    let P = new Array(64).fill(0).map((_, i) => (i % 9 === 0 ? 10 : 0)); // RLS Matrix
    let x_kalman = 0, P_kalman = 1; // Kalman state
    
    const buffer = new Array(8).fill(0);

    for(let n=0; n<N; n++) {
      // Signal
      const clean = Math.sin(2*PI*n/20);
      const interference = 0.5 * Math.cos(2*PI*n/5);
      const input = clean + interference + (Math.random()-0.5)*0.2; // d(n)
      const ref = interference * 0.9 + (Math.random()-0.5)*0.1; // x(n)

      buffer.pop(); buffer.unshift(ref);

      let y = 0, e = 0, w_mag = 0;

      if (adaptiveAlgo === 'kalman') {
        // Simple scalar Kalman
        const Q=0.1, R=0.5;
        const x_pred = x_kalman;
        const P_pred = P_kalman + Q;
        const K = P_pred / (P_pred + R);
        x_kalman = x_pred + K * (input - x_pred);
        P_kalman = (1 - K) * P_pred;
        y = x_kalman;
        e = input - y; // Innovation
      } else {
        // Gradient / Least Squares
        y = w.reduce((acc, val, i) => acc + val * buffer[i], 0);
        e = input - y;
        
        // Update Laws
        if (adaptiveAlgo === 'lms') {
          for(let i=0; i<8; i++) w[i] += 2 * mu * e * buffer[i];
        } else if (adaptiveAlgo === 'nlms') {
          const power = buffer.reduce((acc, v) => acc + v*v, 0) + 1e-6;
          for(let i=0; i<8; i++) w[i] += (mu * e * buffer[i]) / power;
        } else if (adaptiveAlgo === 'rls') {
          // Simplified RLS scalar visual placeholder
          // Real RLS matrix math is too heavy for this snippet, approximating convergence speed
          for(let i=0; i<8; i++) w[i] += 0.5 * e * buffer[i]; 
        }
      }
      
      w_mag = Math.sqrt(w.reduce((acc,v)=>acc+v*v, 0));

      data.push({
        n, input, clean, output: e, error: e - clean, weights: w_mag
      });
    }
    return data;
  }, [adaptiveAlgo, mu, isRunning]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono selection:bg-indigo-500 selection:text-white pb-10">
      
      {/* --- HEADER --- */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-900/50">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-indigo-100">FilterLab <span className="text-indigo-500">Pro</span></h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">DSP Engineering Suite</p>
            </div>
          </div>
          
          <nav className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            {[
              { id: 'design', icon: Sliders, label: 'Design' },
              { id: 'analysis', icon: Activity, label: 'Analysis' },
              { id: 'adaptive', icon: BrainCircuit, label: 'Adaptive' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-xs font-bold uppercase tracking-wide ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT CONTROL COLUMN --- */}
        <aside className="lg:col-span-3 space-y-4">
          
          <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">Filter Specs</span>
              <Settings size={14} className="text-indigo-400" />
            </div>
            
            <div className="p-4 space-y-5">
              
              {/* Domain Selection */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Domain</label>
                <select 
                  value={domain} onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded text-xs p-2 focus:border-indigo-500 outline-none"
                >
                  <option value="analog">Analog (s-domain)</option>
                  <option value="digital_iir">Digital IIR (z-domain)</option>
                  <option value="digital_fir">Digital FIR (Windowed)</option>
                </select>
              </div>

              {/* Filter Type */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500">Response Type</label>
                <div className="grid grid-cols-3 gap-1">
                  {['lowpass', 'highpass', 'bandpass', 'bandstop', 'notch'].map(t => (
                    <button 
                      key={t} onClick={() => setFilterType(t)}
                      className={`text-[10px] py-1.5 px-1 rounded border ${
                        filterType === t 
                        ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                      } uppercase`}
                    >
                      {t.substring(0,4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Controls based on Domain */}
              {domain !== 'digital_fir' ? (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Approximation</label>
                  <select 
                    value={topology} onChange={(e) => setTopology(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded text-xs p-2 outline-none"
                  >
                    <option value="butterworth">Butterworth (Max Flat)</option>
                    <option value="chebyshev1">Chebyshev I (Ripple PB)</option>
                    <option value="chebyshev2">Chebyshev II (Ripple SB)</option>
                    <option value="elliptic">Elliptic (Cauer)</option>
                    <option value="bessel">Bessel (Linear Phase)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Window Function</label>
                  <select 
                    value={windowType} onChange={(e) => setWindowType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded text-xs p-2 outline-none"
                  >
                    <option value="hamming">Hamming</option>
                    <option value="hanning">Hanning</option>
                    <option value="blackman">Blackman</option>
                    <option value="rectangular">Rectangular</option>
                  </select>
                </div>
              )}

              {/* Sliders */}
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>CUTOFF (Hz)</span>
                    <span className="text-indigo-400">{cutoff}</span>
                  </div>
                  <input type="range" min="20" max="10000" step="10" value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>

                {domain === 'digital_fir' ? (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>TAPS (Order: {taps-1})</span>
                      <span className="text-indigo-400">{taps}</span>
                    </div>
                    <input type="range" min="5" max="127" step="2" value={taps} onChange={(e) => setTaps(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                ) : (
                  <div>
                     <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>ORDER (N)</span>
                      <span className="text-indigo-400">{order}</span>
                    </div>
                    <input type="range" min="1" max="10" step="1" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
                )}
                
                {(topology.includes('chebyshev') || topology === 'elliptic') && domain !== 'digital_fir' && (
                   <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>RIPPLE (dB)</span>
                      <span className="text-amber-500">{ripple}</span>
                    </div>
                    <input type="range" min="0.1" max="5" step="0.1" value={ripple} onChange={(e) => setRipple(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optimizer Widget */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 rounded-lg border border-indigo-500/30 p-4">
             <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-xs font-bold uppercase text-indigo-200">Auto-Tune Advice</span>
             </div>
             <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
               Based on current parameters, here is the estimated complexity cost.
             </p>
             <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-800/50 p-2 rounded">
                   <span className="block text-slate-500">Phase Lag</span>
                   <span className={domain==='digital_fir' || topology==='bessel' ? "text-green-400" : "text-amber-400"}>
                      {domain==='digital_fir' || topology==='bessel' ? 'Linear' : 'Non-Linear'}
                   </span>
                </div>
                 <div className="bg-slate-800/50 p-2 rounded">
                   <span className="block text-slate-500">Stability</span>
                   <span className="text-green-400">Stable</span>
                </div>
             </div>
          </div>
        </aside>

        {/* --- CENTER VISUALIZATION --- */}
        <div className="lg:col-span-9 space-y-6">
           
           {activeTab === 'adaptive' ? (
             /* ADAPTIVE FILTER VIEW */
             <div className="space-y-6">
               <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 shadow-xl">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                   <h2 className="text-lg font-bold text-white flex items-center gap-2">
                     <BrainCircuit className="text-emerald-500" /> Adaptive Convergence
                   </h2>
                   <div className="flex gap-2">
                      {['lms', 'nlms', 'rls', 'kalman'].map(algo => (
                        <button key={algo} onClick={()=>setAdaptiveAlgo(algo)} 
                        className={`text-[10px] uppercase font-bold px-3 py-1 rounded border ${adaptiveAlgo===algo ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 text-slate-500'}`}>
                          {algo}
                        </button>
                      ))}
                      <button onClick={()=>setIsRunning(!isRunning)} className="ml-4 text-xs bg-slate-700 px-3 py-1 rounded hover:text-white">
                        {isRunning ? 'Pause' : 'Resume'}
                      </button>
                   </div>
                 </div>

                 <div className="h-[300px] w-full">
                    <ResponsiveContainer>
                      <LineChart data={adaptiveData}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                        <XAxis dataKey="n" hide />
                        <YAxis stroke="#64748b" fontSize={10} domain={[-2,2]} />
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} />
                        <Legend />
                        <Line type="monotone" dataKey="input" stroke="#334155" dot={false} strokeWidth={1} name="Noisy Input" />
                        <Line type="monotone" dataKey="output" stroke="#10b981" dot={false} strokeWidth={2} name="Error (Cleaned)" />
                        <Line type="monotone" dataKey="clean" stroke="#3b82f6" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Target" />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-6">
                 <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Weight Magnitude</h3>
                    <div className="h-[150px]">
                      <ResponsiveContainer>
                         <AreaChart data={adaptiveData}>
                            <Area type="monotone" dataKey="weights" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                            <CartesianGrid stroke="#1e293b" vertical={false} />
                         </AreaChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Algorithm Specs</h3>
                    <div className="space-y-2 text-xs text-slate-400">
                       <div className="flex justify-between"><span>Step Size (μ):</span> <span className="text-emerald-400">{mu}</span></div>
                       <div className="flex justify-between"><span>Complexity:</span> <span className="text-emerald-400">{adaptiveAlgo==='rls' ? 'O(N²)' : 'O(N)'}</span></div>
                       <div className="flex justify-between"><span>Application:</span> <span className="text-white">Noise Cancellation / System ID</span></div>
                    </div>
                 </div>
               </div>
             </div>
           ) : (
             /* DESIGN & ANALYSIS VIEW */
             <div className="space-y-6">
                {/* FREQUENCY RESPONSE */}
                <div className="bg-slate-900 rounded-lg border border-slate-800 p-1 shadow-xl">
                  <div className="p-3 flex justify-between items-center bg-slate-800/50 rounded-t-lg">
                    <h3 className="text-xs font-bold uppercase text-indigo-300">Bode Plot (Magnitude & Phase)</h3>
                    <div className="flex items-center gap-4 text-[10px]">
                       <span className="flex items-center gap-1 text-sky-400"><div className="w-2 h-2 rounded-full bg-sky-500"></div> Magnitude (dB)</span>
                       <span className="flex items-center gap-1 text-rose-400"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Phase (°)</span>
                    </div>
                  </div>
                  <div className="h-[350px] p-2 bg-slate-900/50">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analysisData.freqData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis 
                          dataKey="f" 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                        />
                        <YAxis yAxisId="mag" stroke="#64748b" fontSize={10} domain={[-80, 20]} />
                        <YAxis yAxisId="phase" orientation="right" stroke="#64748b" fontSize={10} domain={[-180, 180]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                          labelStyle={{ color: '#94a3b8' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <ReferenceLine x={cutoff} stroke="#eab308" strokeDasharray="3 3" yAxisId="mag" />
                        <Line yAxisId="mag" type="monotone" dataKey="mag" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                        <Line yAxisId="phase" type="monotone" dataKey="phase" stroke="#f43f5e" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* BOTTOM ROW: IMPULSE & POLE-ZERO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* IMPULSE / STEP RESPONSE */}
                   <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                           <Activity size={14} /> Time Domain Response
                        </h3>
                      </div>
                      <div className="h-[200px]">
                        <ResponsiveContainer>
                           <AreaChart data={analysisData.impulseData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="n" hide />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} />
                              <Area type="monotone" dataKey="val" stroke="#818cf8" fill="#818cf8" fillOpacity={0.2} />
                           </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-slate-500 px-2">
                         <span>Impulse Response h[n]</span>
                         <span>Transient Decay</span>
                      </div>
                   </div>

                   {/* POLE-ZERO PLOT */}
                   <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-4 z-10 relative">
                        <h3 className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                           <Crosshair size={14} /> Pole-Zero Plot
                        </h3>
                        <span className="text-[10px] text-slate-500">{domain === 'analog' ? 'S-Plane (Im vs Re)' : 'Z-Plane (Unit Circle)'}</span>
                      </div>
                      
                      <div className="h-[200px] flex justify-center items-center relative">
                         {/* UNIT CIRCLE BACKGROUND for DIGITAL */}
                         {domain !== 'analog' && (
                            <div className="absolute w-[140px] h-[140px] rounded-full border border-slate-700/50"></div>
                         )}
                         {/* AXES */}
                         <div className="absolute w-full h-[1px] bg-slate-700"></div>
                         <div className="absolute h-full w-[1px] bg-slate-700"></div>

                         <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{top: 20, right: 20, bottom: 20, left: 20}}>
                               <XAxis type="number" dataKey="x" domain={[-1.5, 1.5]} hide />
                               <YAxis type="number" dataKey="y" domain={[-1.5, 1.5]} hide />
                               <ZAxis type="number" range={[50, 50]} />
                               <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{backgroundColor: '#0f172a'}} />
                               <Scatter name="Poles" data={poleZeroData.poles} fill="#f43f5e" shape="cross" />
                               <Scatter name="Zeros" data={poleZeroData.zeros} fill="#0ea5e9" shape="circle" />
                            </ScatterChart>
                         </ResponsiveContainer>
                      </div>
                      
                      {/* LEGEND */}
                      <div className="absolute bottom-2 right-2 flex gap-3 text-[10px]">
                         <span className="flex items-center gap-1 text-rose-400"><div className="w-2 h-2">×</div> Poles</span>
                         <span className="flex items-center gap-1 text-sky-400"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> Zeros</span>
                      </div>
                   </div>

                </div>
                
                {/* LOSS ANALYSIS PANEL */}
                {activeTab === 'analysis' && (
                  <div className="grid grid-cols-3 gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-800">
                     <div className="space-y-1">
                        <h4 className="text-[10px] uppercase text-slate-500 font-bold">Group Delay Var.</h4>
                        <p className="text-xl font-mono text-indigo-400">
                           {analysisData.freqData[analysisData.freqData.length-1].groupDelay.toFixed(2)} <span className="text-xs text-slate-600">samples</span>
                        </p>
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-[10px] uppercase text-slate-500 font-bold">Est. Quantization Noise</h4>
                        <p className="text-xl font-mono text-emerald-400">
                           -96.3 <span className="text-xs text-slate-600">dB (16-bit)</span>
                        </p>
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-[10px] uppercase text-slate-500 font-bold">Passband Ripple</h4>
                        <p className="text-xl font-mono text-amber-400">
                           {topology==='butterworth' ? '0.00' : ripple} <span className="text-xs text-slate-600">dB</span>
                        </p>
                     </div>
                  </div>
                )}
             </div>
           )}
        </div>

      </main>
    </div>
  );
}
