import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, Server, RefreshCw, Cpu, CheckCircle2, XCircle, 
  Upload, FileAudio, Play, AlertCircle, Copy, Check, Sparkles, FileText, 
  BookOpen, AlignLeft, CheckSquare, User, Calendar, ListTodo,
  ChevronRight, ArrowLeft, Clock, FileCheck, Layers, ShieldAlert,
  HelpCircle, HardDrive, Plus, Eye, BarChart3, AlertTriangle, ShieldCheck,
  CalendarDays, HelpCircle as QuestionIcon, MessageSquare, Compass, Send,
  Lock, Mail, LogOut, EyeOff
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Navigation & View State
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'upload' | 'details'
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'qa' | 'summary' | 'transcript' | 'action_items' | 'decisions' | 'deadlines' | 'risks' | 'follow_ups'

  // Data States
  const [meetingsList, setMeetingsList] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Upload & Pipeline Processing States
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStage, setUploadStage] = useState(null); // null | 'uploading' | 'analyzing' | 'complete' | 'error'
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [processingError, setProcessingError] = useState(null);
  const fileInputRef = useRef(null);

  // Custom QA Interface States
  const [userQuestion, setUserQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState([]); // List of { question, answer, score, found }
  const [qaError, setQaError] = useState(null);

  // System Health State
  const [healthStatus, setHealthStatus] = useState({ online: false, latency: null, checkedAt: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedText, setCopiedText] = useState({ transcript: false, summary: false });

  // Auth Helper: Headers with Bearer Token
  const getAuthHeaders = useCallback((customHeaders = {}) => {
    const storedToken = token || localStorage.getItem('token');
    const headers = { ...customHeaders };
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    return headers;
  }, [token]);

  // ----------------------------------------------------
  // Verify Stored Token & Authenticate User
  // ----------------------------------------------------
  const checkAuthMe = useCallback(async (tokenToVerify) => {
    const jwtToken = tokenToVerify || token || localStorage.getItem('token');
    if (!jwtToken) {
      setCurrentUser(null);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
      } else {
        localStorage.removeItem('token');
        setToken('');
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  }, [token]);

  useEffect(() => {
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      checkAuthMe(existingToken);
    }
  }, [checkAuthMe]);

  // ----------------------------------------------------
  // Login / Register Actions
  // ----------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and Password are required.");
      return;
    }

    if (authMode === 'register') {
      if (!authName.trim()) {
        setAuthError("Full Name is required for registration.");
        return;
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
      if (authPassword.length < 6) {
        setAuthError("Password must be at least 6 characters long.");
        return;
      }
    }

    setIsAuthLoading(true);

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register' 
        ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), password: authPassword };

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Authentication failed with status ${res.status}`);
      }

      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      setCurrentUser(data.user);
      setAuthError(null);
      setAuthPassword('');
      setAuthConfirmPassword('');
      setCurrentView('dashboard');
    } catch (err) {
      console.error("Auth submit error:", err);
      setAuthError(err.message || "An error occurred during authentication.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setMeetingsList([]);
    setSelectedMeeting(null);
    setCurrentView('dashboard');
  };

  // ----------------------------------------------------
  // Backend Health Check
  // ----------------------------------------------------
  const checkBackendHealth = useCallback(async () => {
    setIsRefreshing(true);
    const start = performance.now();
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        setHealthStatus({ online: true, latency: elapsed, checkedAt: new Date().toLocaleTimeString() });
      } else {
        setHealthStatus({ online: false, latency: elapsed, checkedAt: new Date().toLocaleTimeString() });
      }
    } catch {
      setHealthStatus({ online: false, latency: null, checkedAt: new Date().toLocaleTimeString() });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ----------------------------------------------------
  // Fetch Meetings List from PostgreSQL
  // ----------------------------------------------------
  const fetchMeetings = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingMeetings(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/meetings`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMeetingsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch meetings list:", err);
    } finally {
      setIsLoadingMeetings(false);
    }
  }, [currentUser, getAuthHeaders]);

  useEffect(() => {
    checkBackendHealth();
    if (currentUser) {
      fetchMeetings();
    }
    const interval = setInterval(checkBackendHealth, 20000);
    return () => clearInterval(interval);
  }, [checkBackendHealth, fetchMeetings, currentUser]);

  // ----------------------------------------------------
  // Fetch Single Meeting Details from PostgreSQL
  // ----------------------------------------------------
  const fetchMeetingDetails = async (meetingId) => {
    setIsLoadingDetails(true);
    setQaHistory([]);
    setUserQuestion('');
    setQaError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedMeeting(data);
        setCurrentView('details');
        setActiveTab('analysis');
      } else {
        console.error("Failed to fetch meeting details:", res.status);
      }
    } catch (err) {
      console.error("Error fetching meeting details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // ----------------------------------------------------
  // Poll Backend Real-Time Processing Status
  // ----------------------------------------------------
  const pollMeetingStatus = useCallback((meetingId) => {
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/status`);
          if (!res.ok) return;
          const data = await res.json();
          const st = (data.status || '').toUpperCase();

          if (st === 'TRANSCRIBING') {
            setUploadStage('transcribing');
            setUploadProgressText('Transcribing audio with faster-whisper...');
          } else if (st === 'TRANSCRIPT_READY') {
            setUploadStage('analyzing');
            setUploadProgressText('Transcript ready. Initializing summarizer...');
          } else if (st === 'SUMMARIZING') {
            setUploadStage('analyzing');
            setUploadProgressText('Generating summary with DistilBART / T5 model...');
          } else if (st === 'EXTRACTING_ACTION_ITEMS') {
            setUploadStage('analyzing');
            setUploadProgressText('Extracting action items with BERT NER...');
          } else if (st === 'ANALYZING') {
            setUploadStage('analyzing');
            setUploadProgressText('Extracting decisions, deadlines, risks & follow-up topics...');
          } else if (st === 'SAVING_RESULTS') {
            setUploadStage('analyzing');
            setUploadProgressText('Persisting results to PostgreSQL database...');
          } else if (st === 'COMPLETED') {
            clearInterval(intervalId);
            setUploadStage('complete');
            setUploadProgressText('Automated analysis complete!');
            resolve(data);
          } else if (st === 'FAILED') {
            clearInterval(intervalId);
            setUploadStage('error');
            setProcessingError(data.error_message || 'Backend processing failed.');
            reject(new Error(data.error_message || 'Processing failed.'));
          }
        } catch (err) {
          console.error("Error polling status:", err);
        }
      }, 1500);
    });
  }, []);

  // ----------------------------------------------------
  // Handle Audio Upload & Real Background Pipeline Execution
  // ----------------------------------------------------
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setProcessingError(null);
      setUploadStage(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) {
      setProcessingError("Please select a supported audio file first (.mp3, .wav, .m4a, .flac).");
      return;
    }

    setProcessingError(null);
    setUploadStage('uploading');
    setUploadProgressText('Uploading recording file to server...');

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const uploadRes = await fetch(`${BACKEND_URL}/api/meetings/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.detail || `Upload failed with status ${uploadRes.status}`);
      }

      const newMeetingId = uploadData.meeting_id;
      setUploadProgressText('File uploaded. Queued for AI pipeline execution...');

      // Poll real-time backend status from PostgreSQL
      await pollMeetingStatus(newMeetingId);

      await fetchMeetings();
      await fetchMeetingDetails(newMeetingId);

    } catch (err) {
      console.error("Pipeline error:", err);
      setUploadStage('error');
      setProcessingError(err.message || "An error occurred during meeting analysis.");
    }
  };

  // ----------------------------------------------------
  // Handle Custom Question Answering Interface
  // ----------------------------------------------------
  const handleAskQuestion = async (e) => {
    if (e) e.preventDefault();
    if (!userQuestion || !userQuestion.trim()) return;
    if (!selectedMeeting) return;

    setIsAsking(true);
    setQaError(null);

    const questionText = userQuestion.trim();

    try {
      const res = await fetch(`${BACKEND_URL}/api/meetings/${selectedMeeting.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          meeting_id: selectedMeeting.id
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Question answering failed with status ${res.status}`);
      }

      setQaHistory((prev) => [
        {
          question: questionText,
          answer: data.answer,
          score: data.score,
          found: data.found
        },
        ...prev
      ]);
      setUserQuestion('');
    } catch (err) {
      console.error("QA error:", err);
      setQaError(err.message || "Failed to get an answer for your question.");
    } finally {
      setIsAsking(false);
    }
  };

  // Manual Trigger Re-Analysis
  const handleReAnalyze = async () => {
    if (!selectedMeeting) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/meetings/${selectedMeeting.id}/reanalyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: selectedMeeting.id }),
      });
      if (res.ok) {
        setProcessingError(null);
        setUploadStage('analyzing');
        setCurrentView('upload');
        setUploadProgressText('Re-analyzing meeting with AI pipeline...');
        await pollMeetingStatus(selectedMeeting.id);
        await fetchMeetings();
        await fetchMeetingDetails(selectedMeeting.id);
      }
    } catch (err) {
      console.error("Failed to re-analyze meeting:", err);
    }
  };

  const copyToClipboard = (text, type) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedText((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedText((prev) => ({ ...prev, [type]: false })), 2000);
    }
  };

  // Status Badge Color Utility
  const renderStatusBadge = (statusStr) => {
    const s = (statusStr || 'uploaded').toUpperCase();
    if (s === 'COMPLETED' || s === 'SUMMARIZED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Analyzed & Completed
        </span>
      );
    } else if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <XCircle size={12} className="text-rose-400" />
          Processing Failed
        </span>
      );
    } else if (s === 'TRANSCRIBING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <RefreshCw size={12} className="spin text-blue-400" />
          Transcribing (Whisper)
        </span>
      );
    } else if (s === 'SUMMARIZING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
          <RefreshCw size={12} className="spin text-purple-400" />
          Summarizing (BART)
        </span>
      );
    } else if (s === 'EXTRACTING_ACTION_ITEMS' || s === 'ANALYZING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          <RefreshCw size={12} className="spin text-cyan-400" />
          Analyzing (BERT)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <RefreshCw size={12} className="spin" />
        Processing
      </span>
    );
  };

  // Metric calculation helpers
  const totalMeetings = meetingsList.length;
  const completedCount = meetingsList.filter(m => m.status === 'completed' || m.summary).length;
  const totalActions = meetingsList.reduce((acc, m) => acc + (m.action_items ? m.action_items.length : 0), 0);

  // Selected Meeting Helpers
  const currentAnalysis = selectedMeeting ? {
    summary: selectedMeeting.summary || (selectedMeeting.analysis ? selectedMeeting.analysis.summary : ""),
    action_items: selectedMeeting.action_items || [],
    decisions: selectedMeeting.decisions || [],
    deadlines: selectedMeeting.deadlines || [],
    risks: selectedMeeting.risks || [],
    follow_up_topics: selectedMeeting.follow_up_topics || []
  } : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-gray-100 font-sans">
      {/* Top Application Header Navbar */}
      <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  AI Meeting Summarizer
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Meeting QA Engine
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Whisper &bull; DistilBART &bull; RoBERTa QA Engine</p>
            </div>
          </div>

          {/* Navigation Bar & Action CTAs */}
          <div className="flex items-center gap-4">
            <nav className="flex items-center bg-gray-900/80 border border-gray-800 rounded-lg p-1">
              <button
                onClick={() => { setCurrentView('dashboard'); fetchMeetings(); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  currentView === 'dashboard' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                Dashboard
              </button>

              <button
                onClick={() => setCurrentView('upload')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  currentView === 'upload' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload size={14} />
                Upload Recording
              </button>
            </nav>

            <button
              onClick={() => setCurrentView('upload')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
            >
              <Plus size={15} />
              Upload New Meeting
            </button>

            {/* Backend Connection Health Status */}
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              healthStatus.online 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${healthStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{healthStatus.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        
        {/* VIEW 1: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Executive Welcome & Primary Action CTA */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-gray-900 to-purple-950/40 border border-indigo-500/20 p-6 md:p-8">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    <Sparkles size={13} /> Automated Analysis & QA Engine
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Upload & Ask Custom Questions About Any Meeting
                  </h2>
                  <p className="text-sm text-gray-400">
                    Extract transcript, summary, tasks, decisions, and ask custom questions grounded strictly in meeting context.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentView('upload')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload size={18} />
                  Upload & Analyze Meeting
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Meetings</span>
                  <FileAudio size={18} className="text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{totalMeetings}</div>
                <p className="text-xs text-gray-500 mt-1">PostgreSQL database</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Analyzed Meetings</span>
                  <Sparkles size={18} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white">{completedCount}</div>
                <p className="text-xs text-gray-500 mt-1">Full pipeline completed</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">AI Summaries</span>
                  <AlignLeft size={18} className="text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{completedCount}</div>
                <p className="text-xs text-gray-500 mt-1">DistilBART model</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between text-gray-400 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Extracted Tasks</span>
                  <CheckSquare size={18} className="text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white">{totalActions}</div>
                <p className="text-xs text-gray-500 mt-1">BERT NER model</p>
              </div>
            </div>

            {/* Recent Meetings Table */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/90">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Recent Meeting Records</h3>
                  <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                    {meetingsList.length}
                  </span>
                </div>
                <button 
                  onClick={fetchMeetings}
                  disabled={isLoadingMeetings}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw size={13} className={isLoadingMeetings ? 'spin' : ''} />
                  Refresh List
                </button>
              </div>

              {isLoadingMeetings ? (
                <div className="p-12 text-center text-gray-400 space-y-3">
                  <RefreshCw size={24} className="spin mx-auto text-indigo-400" />
                  <p className="text-sm font-medium">Loading meetings from PostgreSQL...</p>
                </div>
              ) : meetingsList.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto text-gray-400">
                    <FileAudio size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No Processed Meetings Yet</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Upload an audio recording (.mp3, .wav, .m4a) to automatically extract transcript, summary, action items, decisions & risks.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentView('upload')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} />
                    Upload Audio Recording
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-950/80 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-800">
                      <tr>
                        <th className="px-6 py-3">Meeting Recording</th>
                        <th className="px-6 py-3">Date Processed</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Action Items</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {meetingsList.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-800/40 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                              <FileAudio size={16} />
                            </div>
                            <span className="truncate max-w-xs">{m.filename}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                            {m.created_at ? new Date(m.created_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            {renderStatusBadge(m.status)}
                          </td>
                          <td className="px-6 py-4">
                            {m.action_items && m.action_items.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {m.action_items.length} Task{m.action_items.length === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">0 tasks</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => fetchMeetingDetails(m.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-xs font-semibold text-indigo-300 hover:text-white border border-indigo-500/30 transition-all shadow-sm"
                            >
                              <Eye size={13} />
                              View & Ask
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 2: UPLOAD */}
        {currentView === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Header Navigation Link */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Dashboard
              </button>
              <span className="text-xs font-mono text-indigo-400">
                Automated Meeting Pipeline
              </span>
            </div>

            {/* Upload Box */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 md:p-8 space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload size={20} className="text-indigo-400" />
                  Upload Meeting Audio Recording
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Upload an audio file. The application automatically transcribes audio and extracts Summary, Action Items, Decisions, Deadlines, Risks, and Follow-up Topics.
                </p>
              </div>

              {/* Dropzone Input */}
              <div 
                className="border-2 border-dashed border-gray-700 hover:border-indigo-500/70 rounded-xl p-8 text-center bg-gray-950/40 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4"
                  className="hidden"
                />
                
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <FileAudio size={28} />
                  </div>

                  {selectedFile ? (
                    <div className="bg-indigo-500/15 border border-indigo-500/30 px-4 py-2 rounded-lg inline-flex items-center gap-3">
                      <span className="text-sm font-semibold text-indigo-200">{selectedFile.name}</span>
                      <span className="text-xs font-mono text-indigo-400">
                        ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">Click or Drag audio file here</p>
                        <p className="text-xs text-gray-500 mt-1">Supported Formats: .mp3, .wav, .m4a, .flac, .aac, .ogg</p>
                      </div>
                    </>
                  )}

                  <button 
                    type="button"
                    className="mt-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-colors"
                  >
                    {selectedFile ? 'Change Audio File' : 'Choose Audio File'}
                  </button>
                </div>
              </div>

              {/* Stage Progress Indicator */}
              {uploadStage && uploadStage !== 'complete' && uploadStage !== 'error' && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-indigo-300 flex items-center gap-2">
                      <RefreshCw size={14} className="spin text-indigo-400" />
                      Running Automated Meeting Analysis...
                    </span>
                    <span className="font-mono text-indigo-400">AI Pipeline</span>
                  </div>

                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full w-full animate-pulse"></div>
                  </div>

                  <p className="text-xs text-gray-400 text-center font-medium">
                    {uploadProgressText}
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {processingError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertCircle size={18} className="shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <strong className="font-bold">Analysis Error:</strong>
                    <p className="mt-0.5">{processingError}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  disabled={uploadStage === 'uploading' || uploadStage === 'analyzing'}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUploadAndProcess}
                  disabled={!selectedFile || uploadStage === 'uploading' || uploadStage === 'analyzing'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  Upload & Analyze
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3: MEETING DETAILS, ANALYSIS & CUSTOM QA */}
        {currentView === 'details' && selectedMeeting && (
          <div className="space-y-6">
            
            {/* Header Navigation & Metadata Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft size={14} />
                  Back to Dashboard
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <FileAudio size={24} className="text-indigo-400 shrink-0" />
                    {selectedMeeting.filename}
                  </h2>
                  {renderStatusBadge(selectedMeeting.status)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReAnalyze}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  <Sparkles size={14} />
                  Re-Run Full Analysis
                </button>
              </div>
            </div>

            {/* Custom Question Answering Card Component */}
            <div className="bg-gradient-to-r from-indigo-950/40 via-gray-900 to-purple-950/30 border border-indigo-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-base">
                  <QuestionIcon size={18} className="text-indigo-400" />
                  Ask about this meeting
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                  RoBERTa QA Engine
                </span>
              </div>

              {/* Question Input Form */}
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Type your question... (e.g., Who was assigned the frontend task?)"
                  className="flex-1 bg-gray-950/80 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all"
                  disabled={isAsking}
                />
                <button
                  type="submit"
                  disabled={!userQuestion.trim() || isAsking}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
                >
                  {isAsking ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Ask
                    </>
                  )}
                </button>
              </form>

              {/* Sample Questions Quick Chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="text-gray-500 font-medium">Examples:</span>
                <button
                  type="button"
                  onClick={() => setUserQuestion("Who was assigned the frontend task?")}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-[11px] border border-gray-700 transition-colors"
                >
                  "Who was assigned the frontend task?"
                </button>
                <button
                  type="button"
                  onClick={() => setUserQuestion("What decisions were made?")}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-[11px] border border-gray-700 transition-colors"
                >
                  "What decisions were made?"
                </button>
                <button
                  type="button"
                  onClick={() => setUserQuestion("Which tasks are due on Friday?")}
                  className="px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-[11px] border border-gray-700 transition-colors"
                >
                  "Which tasks are due on Friday?"
                </button>
              </div>

              {/* QA Error Alert */}
              {qaError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2 text-rose-300 text-xs">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{qaError}</span>
                </div>
              )}

              {/* QA Responses Stream / History */}
              {qaHistory.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-800/80 max-h-80 overflow-y-auto pr-1">
                  {qaHistory.map((item, idx) => (
                    <div key={idx} className="bg-gray-950/90 border border-gray-800 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-indigo-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-indigo-400" />
                          User question: "{item.question}"
                        </span>
                        {item.found ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Confidence: {(item.score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                            Unmentioned
                          </span>
                        )}
                      </div>
                      
                      <div className="pl-4 border-l-2 border-indigo-500/40 py-1 text-gray-200">
                        <strong className="text-indigo-400 font-bold block mb-0.5">AI answer:</strong>
                        <p className="text-sm font-medium leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex items-center gap-2 border-b border-gray-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'analysis'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles size={14} />
                Meeting Analysis
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'summary'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <AlignLeft size={14} />
                Summary
              </button>

              <button
                onClick={() => setActiveTab('action_items')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'action_items'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <CheckSquare size={14} />
                Action Items ({currentAnalysis.action_items.length})
              </button>

              <button
                onClick={() => setActiveTab('decisions')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'decisions'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <FileCheck size={14} />
                Decisions ({currentAnalysis.decisions.length})
              </button>

              <button
                onClick={() => setActiveTab('deadlines')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'deadlines'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <CalendarDays size={14} />
                Deadlines ({currentAnalysis.deadlines.length})
              </button>

              <button
                onClick={() => setActiveTab('risks')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'risks'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <ShieldAlert size={14} />
                Risks ({currentAnalysis.risks.length})
              </button>

              <button
                onClick={() => setActiveTab('follow_ups')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'follow_ups'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare size={14} />
                Follow-ups ({currentAnalysis.follow_up_topics.length})
              </button>

              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'transcript'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <FileText size={14} />
                Transcript
              </button>
            </div>

            {/* TAB CONTENT: COMPLETE MEETING ANALYSIS SECTION */}
            {activeTab === 'analysis' && currentAnalysis && (
              <div className="space-y-6">
                
                {/* 1. Summary Block */}
                <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                      <AlignLeft size={16} />
                      Summary
                    </div>
                    {currentAnalysis.summary && (
                      <button
                        onClick={() => copyToClipboard(currentAnalysis.summary, 'summary')}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 text-xs text-gray-300"
                      >
                        {copiedText.summary ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedText.summary ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">
                    {currentAnalysis.summary || <em className="text-gray-500">No summary available.</em>}
                  </p>
                </div>

                {/* 2. Action Items & 3. Deadlines Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Action Items Block */}
                  <div className="bg-gray-900/80 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                        <CheckSquare size={16} />
                        Action Items ({currentAnalysis.action_items.length})
                      </div>
                    </div>

                    {currentAnalysis.action_items.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No action items identified.</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {currentAnalysis.action_items.map((item, idx) => (
                          <div key={idx} className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                {item.person || 'Unassigned'}
                              </span>
                              {item.deadline && (
                                <span className="font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                  {item.deadline}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-200 font-medium">{item.task}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deadlines Block */}
                  <div className="bg-gray-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                        <CalendarDays size={16} />
                        Deadlines ({currentAnalysis.deadlines.length})
                      </div>
                    </div>

                    {currentAnalysis.deadlines.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No explicit deadlines mentioned.</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {currentAnalysis.deadlines.map((dl, idx) => (
                          <div key={idx} className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 flex items-center justify-between gap-3 text-xs">
                            <span className="text-gray-200 font-medium">{dl.task}</span>
                            <span className="font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-1 rounded border border-cyan-500/30 shrink-0">
                              {dl.deadline}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Decisions, 5. Risks & 6. Follow-up Topics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Decisions */}
                  <div className="bg-gray-900/80 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b border-gray-800 pb-2">
                      <FileCheck size={16} />
                      Decisions ({currentAnalysis.decisions.length})
                    </div>
                    {currentAnalysis.decisions.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No decisions recorded.</p>
                    ) : (
                      <ul className="space-y-2 max-h-60 overflow-y-auto text-xs">
                        {currentAnalysis.decisions.map((d, i) => (
                          <li key={i} className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-gray-200 flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Risks / Issues */}
                  <div className="bg-gray-900/80 border border-rose-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm border-b border-gray-800 pb-2">
                      <ShieldAlert size={16} />
                      Risks / Issues ({currentAnalysis.risks.length})
                    </div>
                    {currentAnalysis.risks.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No risks or blockers identified.</p>
                    ) : (
                      <ul className="space-y-2 max-h-60 overflow-y-auto text-xs">
                        {currentAnalysis.risks.map((r, i) => (
                          <li key={i} className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-rose-200 flex items-start gap-2">
                            <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Follow-up Topics */}
                  <div className="bg-gray-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm border-b border-gray-800 pb-2">
                      <MessageSquare size={16} />
                      Follow-up Topics ({currentAnalysis.follow_up_topics.length})
                    </div>
                    {currentAnalysis.follow_up_topics.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No follow-up topics flagged.</p>
                    ) : (
                      <ul className="space-y-2 max-h-60 overflow-y-auto text-xs">
                        {currentAnalysis.follow_up_topics.map((f, i) => (
                          <li key={i} className="bg-gray-950 p-2.5 rounded-lg border border-gray-800 text-amber-200 flex items-start gap-2">
                            <Compass size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: INDIVIDUAL SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div className="bg-gray-900/80 border border-purple-500/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                    <AlignLeft size={16} />
                    Summary (DistilBART Transformer)
                  </div>
                  {currentAnalysis.summary && (
                    <button
                      onClick={() => copyToClipboard(currentAnalysis.summary, 'summary')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-800 text-xs text-gray-300"
                    >
                      {copiedText.summary ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedText.summary ? 'Copied' : 'Copy Summary'}
                    </button>
                  )}
                </div>
                <div className="text-sm leading-relaxed text-gray-200">
                  {currentAnalysis.summary || <em className="text-gray-500">No summary generated.</em>}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ACTION ITEMS */}
            {activeTab === 'action_items' && (
              <div className="bg-gray-900/80 border border-indigo-500/30 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                    <CheckSquare size={16} />
                    Action Items ({currentAnalysis.action_items.length})
                  </div>
                </div>
                {currentAnalysis.action_items.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs italic">No action items identified.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-950/80 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-800">
                        <tr>
                          <th className="px-6 py-3">Person</th>
                          <th className="px-6 py-3">Task Description</th>
                          <th className="px-6 py-3">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {currentAnalysis.action_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/30">
                            <td className="px-6 py-4">
                              <span className="text-xs font-semibold bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                                {item.person || 'Unassigned'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-200">{item.task}</td>
                            <td className="px-6 py-4">
                              {item.deadline ? (
                                <span className="text-xs font-mono bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
                                  {item.deadline}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 italic">No deadline</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: DECISIONS */}
            {activeTab === 'decisions' && (
              <div className="bg-gray-900/80 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
                <div className="text-emerald-400 font-bold text-sm border-b border-gray-800 pb-3 flex items-center gap-2">
                  <FileCheck size={16} />
                  Decisions ({currentAnalysis.decisions.length})
                </div>
                {currentAnalysis.decisions.length === 0 ? (
                  <div className="text-xs text-gray-500 italic p-4 text-center">No decisions recorded.</div>
                ) : (
                  <ul className="space-y-2">
                    {currentAnalysis.decisions.map((d, i) => (
                      <li key={i} className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-sm text-gray-200 flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* TAB CONTENT: DEADLINES */}
            {activeTab === 'deadlines' && (
              <div className="bg-gray-900/80 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
                <div className="text-cyan-300 font-bold text-sm border-b border-gray-800 pb-3 flex items-center gap-2">
                  <CalendarDays size={16} />
                  Deadlines ({currentAnalysis.deadlines.length})
                </div>
                {currentAnalysis.deadlines.length === 0 ? (
                  <div className="text-xs text-gray-500 italic p-4 text-center">No deadlines identified.</div>
                ) : (
                  <div className="space-y-2">
                    {currentAnalysis.deadlines.map((dl, i) => (
                      <div key={i} className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex items-center justify-between gap-4 text-sm">
                        <span className="text-gray-200 font-medium">{dl.task}</span>
                        <span className="font-mono font-bold text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded border border-cyan-500/30 shrink-0">
                          {dl.deadline}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: RISKS */}
            {activeTab === 'risks' && (
              <div className="bg-gray-900/80 border border-rose-500/30 rounded-2xl p-6 space-y-4">
                <div className="text-rose-400 font-bold text-sm border-b border-gray-800 pb-3 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Risks / Issues ({currentAnalysis.risks.length})
                </div>
                {currentAnalysis.risks.length === 0 ? (
                  <div className="text-xs text-gray-500 italic p-4 text-center">No risks or blockers identified.</div>
                ) : (
                  <ul className="space-y-2">
                    {currentAnalysis.risks.map((r, i) => (
                      <li key={i} className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-sm text-rose-200 flex items-start gap-3">
                        <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* TAB CONTENT: FOLLOW-UP TOPICS */}
            {activeTab === 'follow_ups' && (
              <div className="bg-gray-900/80 border border-amber-500/30 rounded-2xl p-6 space-y-4">
                <div className="text-amber-400 font-bold text-sm border-b border-gray-800 pb-3 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Follow-up Topics ({currentAnalysis.follow_up_topics.length})
                </div>
                {currentAnalysis.follow_up_topics.length === 0 ? (
                  <div className="text-xs text-gray-500 italic p-4 text-center">No follow-up topics flagged.</div>
                ) : (
                  <ul className="space-y-2">
                    {currentAnalysis.follow_up_topics.map((f, i) => (
                      <li key={i} className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-sm text-amber-200 flex items-start gap-3">
                        <Compass size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* TAB CONTENT: TRANSCRIPT */}
            {activeTab === 'transcript' && (
              <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2 text-gray-200 font-bold text-sm">
                    <FileText size={16} />
                    Full Meeting Transcript
                  </div>
                  {selectedMeeting.transcript && (
                    <button
                      onClick={() => copyToClipboard(selectedMeeting.transcript, 'transcript')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-800 text-xs text-gray-300"
                    >
                      {copiedText.transcript ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedText.transcript ? 'Copy Transcript' : 'Copy Transcript'}
                    </button>
                  )}
                </div>
                <div className="bg-gray-950 p-5 rounded-xl border border-gray-800 text-sm leading-relaxed text-gray-200 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans">
                  {selectedMeeting.transcript || <em className="text-gray-500">No transcript available.</em>}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
        AI Meeting Summarizer &bull; Custom Question Answering Interface &bull; React + FastAPI + RoBERTa QA
      </footer>
    </div>
  );
}
