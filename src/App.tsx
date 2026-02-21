import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Member } from './types';
import { IDCard } from './components/IDCard';
import { Shield, UserPlus, Printer, Search, CheckCircle, AlertCircle, Loader2, Maximize2, X, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'verify' | 'admin'>('register');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [stats, setStats] = useState({ totalMembers: 0, totalScans: 0 });
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [showZoom, setShowZoom] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [leftFlagBase64, setLeftFlagBase64] = useState<string>('');
  const [centerLogoBase64, setCenterLogoBase64] = useState<string>('');
  const [rightFlagBase64, setRightFlagBase64] = useState<string>('');

  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
    documentTitle: member ? `ID_${member.id_number}` : 'Police_ID',
  });

  const translateFields = async (data: { full_name: string, rank: string, responsibility: string }) => {
    setTranslating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate and transliterate the following Ethiopian police officer details into both Amharic and English. 
        If the input is in Amharic, provide the English version. 
        If the input is in English, provide the Amharic version. 
        Return the result as a JSON object with fields: full_name, rank, responsibility. 
        Each field must be in the format 'Amharic / English'.
        
        Input:
        Full Name: ${data.full_name}
        Rank: ${data.rank}
        Responsibility: ${data.responsibility}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              full_name: { type: Type.STRING },
              rank: { type: Type.STRING },
              responsibility: { type: Type.STRING },
            },
            required: ["full_name", "rank", "responsibility"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      return result;
    } catch (err) {
      console.error("Translation error:", err);
      return data; // Fallback to original data if translation fails
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      full_name: formData.get('full_name') as string,
      rank: formData.get('rank') as string,
      responsibility: formData.get('responsibility') as string,
      phone_number: formData.get('phone_number') as string,
    };

    // Auto-translate fields
    const translatedData = await translateFields({
      full_name: rawData.full_name,
      rank: rawData.rank,
      responsibility: rawData.responsibility,
    });

    const finalData = {
      ...translatedData,
      phone_number: rawData.phone_number,
      photo_url: photoBase64,
      left_flag_url: leftFlagBase64,
      center_logo_url: centerLogoBase64,
      right_flag_url: rightFlagBase64,
    };

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });
      const result = await res.json();
      if (res.ok) {
        setMember({ ...finalData, id_number: result.id_number } as Member);
        fetchMembers(); // Refresh the list
        fetchStats();   // Refresh stats
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save member data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isVerified, setIsVerified] = useState(false);

  const handleSearch = async () => {
    if (!searchId) return;
    setLoading(true);
    setError(null);
    setIsVerified(false);
    try {
      // Search by ID, Name or Phone
      const res = await fetch(`/api/members/search?query=${encodeURIComponent(searchId)}`);
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data) && data.length > 0) {
          setMember(data[0]); // Take the first match
          setIsVerified(true);
          // Log scan if it looks like an ID
          if (searchId.includes('BGR-POL')) {
            await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id_number: data[0].id_number, scanner_info: 'Web Search' }),
            });
          }
        } else if (!Array.isArray(data) && data.id_number) {
          setMember(data);
          setIsVerified(true);
        } else {
          setError('No member found matching your search');
          setMember(null);
        }
      } else {
        setError('Member not found');
        setMember(null);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {}
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembersList(data);
    } catch (err) {}
  };

  // Check for verification URL on load
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const id = path.split('/')[2];
      setSearchId(id);
      setActiveTab('verify');
      handleSearch();
    }
    fetchStats();
    fetchMembers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation - Hidden when viewing a verified member to provide clean view */}
      {!(activeTab === 'verify' && member && !error) && (
        <nav className="bg-blue-900 text-white shadow-lg sticky top-0 z-50 print:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-yellow-400" />
              <div>
                <h1 className="text-lg font-bold leading-tight">BGR Police Commission</h1>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest">ID Management System</p>
              </div>
            </div>
            <div className="flex gap-1 bg-blue-800/50 p-1 rounded-lg">
              <button 
                onClick={() => { setActiveTab('register'); setMember(null); setError(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'register' ? 'bg-white text-blue-900 shadow-sm' : 'hover:bg-white/10'}`}
              >
                Register
              </button>
              <button 
                onClick={() => { setActiveTab('verify'); setMember(null); setError(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'verify' ? 'bg-white text-blue-900 shadow-sm' : 'hover:bg-white/10'}`}
              >
                Verify / Search
              </button>
              <button 
                onClick={() => { setActiveTab('admin'); fetchStats(); fetchMembers(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white text-blue-900 shadow-sm' : 'hover:bg-white/10'}`}
              >
                Dashboard
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className={cn("max-w-6xl mx-auto p-6 print:p-0", (activeTab === 'verify' && member && !error) && "p-0 max-w-none")}>
        <AnimatePresence mode="wait">
          {activeTab === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Form */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <UserPlus className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold">New Member Registration</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-slate-700">Full Name / ሙሉ ስም</label>
                    <input name="full_name" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Enter full name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1.5 text-slate-700">Rank / ማዕረግ</label>
                      <input name="rank" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. Inspector" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5 text-slate-700">Responsibility / ሀላፊነት</label>
                      <input name="responsibility" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. Field Officer" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-slate-700">Phone Number / ስልክ ቁጥር</label>
                    <input name="phone_number" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="+251..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-slate-700">Photo / ፎቶ</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-400 transition-colors cursor-pointer relative">
                      <div className="space-y-1 text-center">
                        {photoBase64 ? (
                          <img src={photoBase64} className="mx-auto h-24 w-24 object-cover rounded-lg shadow-md" alt="Preview" />
                        ) : (
                          <div className="mx-auto h-12 w-12 text-slate-400 flex items-center justify-center">
                            <UserPlus className="w-8 h-8" />
                          </div>
                        )}
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                            <span>Upload photo</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, setPhotoBase64)} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 text-slate-500 uppercase">Left Flag</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 text-center">
                        {leftFlagBase64 ? (
                          <img src={leftFlagBase64} className="h-8 w-full object-contain mx-auto" />
                        ) : (
                          <div className="text-[8px] text-slate-400">BGR Flag</div>
                        )}
                        <label className="block mt-1 text-[8px] text-blue-600 cursor-pointer font-bold">
                          Upload
                          <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, setLeftFlagBase64)} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 text-slate-500 uppercase">Center Logo</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 text-center">
                        {centerLogoBase64 ? (
                          <img src={centerLogoBase64} className="h-8 w-full object-contain mx-auto" />
                        ) : (
                          <div className="text-[8px] text-slate-400">Logo</div>
                        )}
                        <label className="block mt-1 text-[8px] text-blue-600 cursor-pointer font-bold">
                          Upload
                          <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, setCenterLogoBase64)} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 text-slate-500 uppercase">Right Flag</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 text-center">
                        {rightFlagBase64 ? (
                          <img src={rightFlagBase64} className="h-8 w-full object-contain mx-auto" />
                        ) : (
                          <div className="text-[8px] text-slate-400">ETH Flag</div>
                        )}
                        <label className="block mt-1 text-[8px] text-blue-600 cursor-pointer font-bold">
                          Upload
                          <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, setRightFlagBase64)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || translating}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {translating ? "Translating..." : "Generating..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Generate ID Card
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Preview & Print */}
              <div className="flex flex-col items-center justify-start gap-6">
                {member ? (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
                       <div className="flex justify-between items-center mb-6">
                          <div>
                            <h3 className="font-bold text-slate-800">ID Preview</h3>
                            <p className="text-xs text-slate-500">Click card to enlarge</p>
                          </div>
                          <button 
                            onClick={() => handlePrint()}
                            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
                          >
                            <Printer className="w-4 h-4" /> Print ID
                          </button>
                       </div>
                       <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-center">
                          <IDCard ref={cardRef} member={member} preview onCardClick={() => setShowZoom(true)} />
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <Shield className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium">Complete the form to generate the ID card preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'verify' && (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Search className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold">Verify ID Authenticity</h2>
                </div>

                <div className="flex gap-3 mb-8">
                  <input 
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" 
                    placeholder="Search by Name, Phone, or ID Number" 
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    Search
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-6">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">{error}</p>
                  </div>
                )}

                {member && !error && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl print:hidden">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5" />
                        <p className="font-bold">Verified Authentic Member</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setMember(null); setSearchId(''); }}
                          className="px-4 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-all"
                        >
                          New Search
                        </button>
                        <button 
                          onClick={() => handlePrint()}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-md"
                        >
                          <Printer className="w-4 h-4" /> Print ID
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-center py-8 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 pointer-events-none select-none">
                      <IDCard ref={cardRef} member={member} showOnlyFront={true} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-slate-500 font-medium mb-1 text-sm">Total Members</p>
                  <p className="text-4xl font-black text-blue-600">{stats.totalMembers}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-slate-500 font-medium mb-1 text-sm">Verification Scans</p>
                  <p className="text-4xl font-black text-emerald-600">{stats.totalScans}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-slate-500 font-medium mb-1 text-sm">System Status</p>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    Operational
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Member Directory</h3>
                    <p className="text-xs text-slate-500">Registered officers sorted alphabetically</p>
                  </div>
                  <button 
                    onClick={fetchMembers}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                    title="Refresh List"
                  >
                    <Loader2 className={cn("w-5 h-5", loading && "animate-spin")} />
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                        <th className="px-6 py-4">Photo</th>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">ID Number</th>
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">Responsibility</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {membersList.length > 0 ? (
                        membersList.map((m) => (
                          <tr key={m.id_number} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4">
                              <img src={m.photo_url} className="w-10 h-10 rounded-full object-cover border border-slate-200" alt="" />
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800 text-sm">{m.full_name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-100">
                                {m.id_number}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">{m.rank}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">{m.responsibility}</td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => { setMember(m); setActiveTab('register'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 ml-auto group-hover:translate-x-[-4px] transition-transform"
                              >
                                View ID <Maximize2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                            <Shield className="w-12 h-12 mx-auto mb-3 opacity-10" />
                            <p className="font-medium">No members registered yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Zoom Modal */}
      <AnimatePresence>
        {showZoom && member && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
            onClick={() => setShowZoom(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-5xl w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowZoom(false)}
                className="absolute -top-4 -right-4 bg-white text-slate-900 p-2 rounded-full shadow-xl hover:bg-slate-100 transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center gap-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-slate-900">ID Card Full View</h2>
                  <p className="text-slate-500">Review the front and back of the ID card before printing.</p>
                </div>

                <div className="scale-125 md:scale-150 py-12">
                  <IDCard member={member} preview />
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setShowZoom(false)}
                    className="px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Close Preview
                  </button>
                  <button 
                    onClick={() => { setShowZoom(false); handlePrint(); }}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-lg shadow-emerald-200"
                  >
                    <Printer className="w-5 h-5" /> Print Now
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Print Container */}
      <div className="hidden">
        <div ref={cardRef}>
          {member && <IDCard member={member} />}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Benishangul Gumuz Region Police Commission. All rights reserved.</p>
      </footer>
    </div>
  );
}
