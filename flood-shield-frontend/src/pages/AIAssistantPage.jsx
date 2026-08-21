import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Info, 
  Layers, 
  Compass, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  HelpCircle,
  FileText,
  RefreshCw,
  Key,
  ShieldCheck,
  ChevronDown,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AIAssistantPage() {
  const { token, language, mongoUser } = useAuth();
  const { theme } = useTheme();

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // System States
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // RAG / Dialect Configuration
  const [chatLang, setChatLang] = useState('en'); // en, bn, sylheti, chittagonian
  const outputType = 'explanation';
  const [inputText, setInputText] = useState('');
  const [selectedSource, setSelectedSource] = useState(null);
  const [locating, setLocating] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');

  // Custom API Key Drawer Configuration
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('user_openai_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [keyCheck, setKeyCheck] = useState({ status: 'idle', message: '' });
  const [testingKey, setTestingKey] = useState(false);

  // Voice Interaction States
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const pendingVoiceRef = useRef('');
  const wantListeningRef = useRef(false);
  const voicePrefixRef = useRef('');

  // Translations
  const translations = {
    en: {
      pageTitle: "AI Assistant & Knowledge Hub",
      pageSub: "Bilingual, localized emergency chatbot running Retrieval-Augmented Generation (RAG) on historical flood reports.",
      dialectLabel: "Chat Dialect Accent",
      inputPlaceholder: "Ask about historical floods, weather patterns, or safety...",
      voiceListening: "Listening... Speak now.",
      clearBtn: "Clear Chat Logs",
      statusTitle: "RAG Knowledge Index Status",
      statusIndexed: "Documents Compiled",
      statusChunks: "Knowledge Chunks",
      statusMode: "RAG Mode Active",
      sourcesTitle: "Facts Sourced From FFWC Reports",
      sourceBadge: "RAG Context",
      readAloud: "Read response aloud",
      stopSpeech: "Stop reading",
      modelUsed: "AI Engine",
      customKeyTitle: "Configure Private OpenAI Key",
      customKeyPlaceholder: "sk-or-v1-... or sk-proj-...",
      customKeySave: "Save & test key",
      customKeyTesting: "Checking whether this key works...",
      customKeySuccess: "API key stored in this browser.",
      customKeyWorking: "This key is working.",
      customKeyFailed: "This key is not working.",
      errorSpeechBlocked: "Speech recognition is not supported here. Use Chrome or Edge, and allow the microphone.",
      voiceMicTitle: "Speak in English or Bangla — review the text, then press send",
      voiceMicStop: "Stop listening",
      voiceNoSpeech: "No speech heard. Click the mic and speak clearly.",
      voiceMicDenied: "Microphone permission denied. Allow the mic in the browser address bar, then try again.",
      voiceMicNetwork: "Speech-to-text needs an internet connection. Check Wi-Fi and try again.",
      useMyLocation: "Use my current location",
      locating: "Detecting GPS...",
      locationSet: "Location set",
      locationDenied: "Location permission denied. Allow location in the browser, then tap the button again.",
      locationFailed: "Could not read GPS. Try again.",
      locationUnsupported: "This browser cannot share GPS location.",
      sylhetiAccent: "Sylheti Accent",
      chittagonianAccent: "Chittagonian Accent",
      englishAccent: "Standard English",
      banglaAccent: "Standard Bangla",
      sampleQuestions: [
        "What happened in the 2017 Sylhet flood?",
        "Which district is the most risky right now?",
        "Where is the closest shelter from me?",
        "From my current location, what should I do?"
      ]
    },
    bn: {
      pageTitle: "এআই অ্যাসিস্ট্যান্ট ও তথ্য কেন্দ্র",
      pageSub: "বন্যা পিডিএফ রিপোর্টের ওপর রিট্রিভাল-অগমেন্টেড জেনারেশন (RAG) চালিত বহুমুখী চ্যাটবট।",
      dialectLabel: "চ্যাট উপভাষা ও অ্যাকসেন্ট",
      inputPlaceholder: "বন্যার ইতিহাস, আবহাওয়া বা নিরাপত্তা সংক্রান্ত প্রশ্ন করুন...",
      voiceListening: "শুনছি... এখন কথা বলুন।",
      clearBtn: "চ্যাট হিস্ট্রি মুছুন",
      statusTitle: "RAG ইনডেক্সিং স্ট্যাটাস",
      statusIndexed: "সংকলিত রিপোর্ট ফাইল",
      statusChunks: "ইনডেক্সড টেক্সট চাঙ্কস",
      statusMode: "RAG মোড সক্রিয়",
      sourcesTitle: "তথ্য সূত্র (FFWC বার্ষিক রিপোর্ট)",
      sourceBadge: "RAG সোর্স",
      readAloud: "জোরে পড়ুন",
      stopSpeech: "পড়া বন্ধ করুন",
      modelUsed: "এআই ইঞ্জিন",
      customKeyTitle: "নিজস্ব OpenAI API কী যুক্ত করুন",
      customKeyPlaceholder: "sk-or-v1-... বা sk-proj-...",
      customKeySave: "সেভ করে পরীক্ষা করুন",
      customKeyTesting: "কী কাজ করছে কিনা যাচাই হচ্ছে...",
      customKeySuccess: "API কী এই ব্রাউজারে সংরক্ষণ করা হয়েছে।",
      customKeyWorking: "এই কী কাজ করছে।",
      customKeyFailed: "এই কী কাজ করছে না।",
      errorSpeechBlocked: "এই ব্রাউজারে ভয়েস রিকগনিশন চলে না। Chrome বা Edge ব্যবহার করুন এবং মাইক্রোফোন অনুমতি দিন।",
      voiceMicTitle: "ইংরেজি বা বাংলায় বলুন — লেখা দেখে তারপর পাঠান",
      voiceMicStop: "শোনা বন্ধ করুন",
      voiceNoSpeech: "কোনো কথা শোনা যায়নি। মাইক চাপুন এবং স্পষ্ট করে বলুন।",
      voiceMicDenied: "মাইক্রোফোন অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানা বারে মাইক অনুমতি দিন।",
      voiceMicNetwork: "ভয়েস থেকে লেখার জন্য ইন্টারনেট লাগবে। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
      useMyLocation: "আমার বর্তমান অবস্থান ব্যবহার করুন",
      locating: "জিপিএস খোঁজা হচ্ছে...",
      locationSet: "অবস্থান সেট হয়েছে",
      locationDenied: "লোকেশন অনুমতি দেওয়া হয়নি। ব্রাউজারে Allow চাপুন, তারপর আবার বাটনে চাপুন।",
      locationFailed: "জিপিএস পড়া যায়নি। আবার চেষ্টা করুন।",
      locationUnsupported: "এই ব্রাউজার জিপিএস শেয়ার করতে পারে না।",
      sylhetiAccent: "সিলেটি উপভাষা",
      chittagonianAccent: "চাটগাঁইয়া উপভাষা",
      englishAccent: "ইংরেজি ভাষা",
      banglaAccent: "প্রমিত বাংলা",
      sampleQuestions: [
        "২০১৭ সালের সিলেট বন্যায় কি ঘটেছিল?",
        "বাঁধ ভাঙনের সময় কি কি নিরাপত্তা অবলম্বন করতে হবে?",
        "কুড়িগ্রাম অঞ্চলের আশ্রয়কেন্দ্রগুলোর সুপারিশ করো।",
        "২০২০ FFWC রিপোর্টের মূল পরিসংখ্যানগুলো বলো।"
      ]
    }
  };

  const t = translations[language] || translations['en'];
  const isGovAdmin = mongoUser?.role === 'Government';

  // Scroll only the chat pane — never the whole page.
  // scrollIntoView() was aligning the empty sentinel to the top of the viewport,
  // which hid the new reply until the user opened a fresh tab.
  const scrollToBottom = () => {
    const box = chatScrollRef.current;
    if (box) {
      box.scrollTop = box.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, sending]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        // Session already closed
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Load chat logs & index status on mount
  const fetchLogsAndStatus = async () => {
    try {
      setLoadingHistory(true);
      setErrorMsg('');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [histRes, statRes] = await Promise.all([
        fetch(`${API_URL}/ai/history`, { headers }),
        fetch(`${API_URL}/ai/status`, { headers })
      ]);

      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(Array.isArray(histData) ? histData : []);
      }
      if (statRes.ok) {
        const statData = await statRes.json();
        setStatus(statData);
        if (statData.status === 'starting' || statData.waking) {
          setInfoMsg(language === 'en'
            ? 'Starting the AI engine. The first open after idle can take about a minute on free hosting.'
            : 'এআই ইঞ্জিন চালু হচ্ছে। ফ্রি হোস্টিং-এ প্রথমবার খুলতে প্রায় এক মিনিট লাগতে পারে।');
        } else {
          setInfoMsg('');
        }
      }
    } catch (e) {
      console.error('Failed to load AI Assistant configurations:', e);
      setStatus({ status: 'starting', waking: true, mode: 'Starting AI engine...' });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchLogsAndStatus();

    let attempts = 0;
    const id = setInterval(async () => {
      attempts += 1;
      if (attempts > 18) {
        clearInterval(id);
        return;
      }
      try {
        const statRes = await fetch(`${API_URL}/ai/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!statRes.ok) return;
        const statData = await statRes.json();
        setStatus(statData);
        if (statData.status && statData.status !== 'starting' && statData.status !== 'offline') {
          setInfoMsg('');
          clearInterval(id);
        }
      } catch {
        // Keep polling while Render boots
      }
    }, 5000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const parseCoord = (value) => {
    const n = parseFloat(String(value).trim());
    return Number.isFinite(n) ? n : null;
  };

  const latValue = parseCoord(latInput);
  const lonValue = parseCoord(lonInput);
  const latReady = latValue !== null && latValue >= -90 && latValue <= 90;
  const lonReady = lonValue !== null && lonValue >= -180 && lonValue <= 180;

  const coordFieldClass = (ready) =>
    `rounded-xl px-3 py-2.5 text-xs outline-none transition-colors ${
      ready
        ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-50 placeholder-emerald-200/50'
        : 'bg-slate-950 border border-white/10 text-white placeholder-slate-600 focus:border-flood-cyan-400'
    }`;

  const applyCoordinates = (lat, lon) => {
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      setErrorMsg(language === 'en' ? 'Enter valid latitude and longitude numbers.' : 'সঠিক অক্ষাংশ ও দ্রাঘিমাংশ দিন।');
      return false;
    }
    if (la < -90 || la > 90 || lo < -180 || lo > 180) {
      setErrorMsg(language === 'en' ? 'Latitude must be -90 to 90 and longitude -180 to 180.' : 'অক্ষাংশ -৯০ থেকে ৯০ এবং দ্রাঘিমাংশ -১৮০ থেকে ১৮০ হতে হবে।');
      return false;
    }
    setLatInput(la.toFixed(4));
    setLonInput(lo.toFixed(4));
    setErrorMsg('');
    setInfoMsg(
      language === 'en'
        ? `GPS filled the fields: ${la.toFixed(4)}, ${lo.toFixed(4)}. The assistant uses these numbers.`
        : `জিপিএস ফিল্ড পূরণ করেছে: ${la.toFixed(4)}, ${lo.toFixed(4)}। অ্যাসিস্ট্যান্ট এই মান ব্যবহার করবে।`
    );
    return true;
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg(t.locationUnsupported);
      return;
    }
    setLocating(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        applyCoordinates(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setErrorMsg(err.code === 1 ? t.locationDenied : t.locationFailed);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const sendChatMessage = async (rawText) => {
    const messageText = String(rawText || '').trim();
    if (!messageText || sending) return;

    setInputText('');
    setSending(true);
    setErrorMsg('');
    setInfoMsg('');
    setSelectedSource(null);

    const tempUserMsg = {
      _id: Date.now().toString(),
      sender: 'user',
      message: messageText,
      language: chatLang,
      outputType,
      timestamp: new Date()
    };

    setHistory(prev => [...prev, tempUserMsg]);
    setInfoMsg(language === 'en'
      ? 'Contacting the AI engine. First reply after idle hosting can take up to a minute.'
      : 'এআই ইঞ্জিনে পাঠানো হচ্ছে। ফ্রি হোস্টিং-এ প্রথম উত্তর এক মিনিট নিতে পারে।');

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      const savedKey = (customApiKey || localStorage.getItem('user_openai_key') || '').trim();
      if (savedKey) headers['x-openai-key'] = savedKey;

      const response = await fetch(`${API_URL}/ai/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageText,
          language: chatLang,
          outputType,
          district: mongoUser?.district || mongoUser?.allocatedArea || '',
          latitude: latReady ? latValue : undefined,
          longitude: lonReady ? lonValue : undefined
        })
      });

      if (!response.ok) {
        let errMessage = 'AI message routing failed';
        try {
          const err = await response.json();
          errMessage = err.message || errMessage;
        } catch {
          errMessage = `Server returned ${response.status}`;
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      const saved = data.message || {};
      const replyText = saved.message || data.response || '';

      setHistory(prev => [
        ...prev.filter(m => String(m._id) !== String(tempUserMsg._id)),
        {
          _id: saved._id ? `${saved._id}-user` : `${tempUserMsg._id}-u`,
          sender: 'user',
          message: messageText,
          language: chatLang,
          outputType,
          timestamp: saved.timestamp || new Date()
        },
        {
          _id: saved._id || `${tempUserMsg._id}-ai`,
          sender: 'ai',
          message: replyText || 'No reply was returned.',
          language: chatLang,
          outputType,
          timestamp: saved.timestamp || new Date(),
          sources: data.sources,
          modelUsed: data.modelUsed
        }
      ]);
      setInfoMsg('');

      // If the live append missed the saved reply, reload from the server.
      if (!replyText) {
        try {
          const histRes = await fetch(`${API_URL}/ai/history`, { headers: { Authorization: `Bearer ${token}` } });
          if (histRes.ok) {
            const histData = await histRes.json();
            if (Array.isArray(histData) && histData.length) setHistory(histData);
          }
        } catch {
          // Keep the local messages already shown
        }
      }
    } catch (e) {
      console.error(e);
      let recovered = false;
      try {
        const histRes = await fetch(`${API_URL}/ai/history`, { headers: { Authorization: `Bearer ${token}` } });
        if (histRes.ok) {
          const histData = await histRes.json();
          if (Array.isArray(histData) && histData.length > 0) {
            setHistory(histData);
            recovered = true;
            setErrorMsg('');
            setInfoMsg('');
          }
        }
      } catch {
        // Fall through to the on-screen error bubble
      }
      if (!recovered) {
        setErrorMsg(e.message || 'Failed to reach the AI server.');
        setHistory(prev => [
          ...prev.filter(m => String(m._id) !== String(tempUserMsg._id)),
          { ...tempUserMsg, _id: `${tempUserMsg._id}-kept` },
          {
            _id: `${tempUserMsg._id}-err`,
            sender: 'ai',
            message: `Could not get a live AI reply (${e.message}). Wait a few seconds and refresh if the answer was saved.`,
            language: chatLang,
            outputType,
            timestamp: new Date(),
            modelUsed: 'Local error'
          }
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  const speechLangForChat = () => (chatLang === 'en' ? 'en-US' : 'bn-BD');

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg(t.errorSpeechBlocked);
      return;
    }

    if (wantListeningRef.current && recognitionRef.current) {
      wantListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {
        setIsListening(false);
      }
      return;
    }

    if (sending) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    } catch {
      // Ignore abort of a previous session
    }

    pendingVoiceRef.current = '';
    voicePrefixRef.current = inputText.trim() ? `${inputText.trim()} ` : '';
    wantListeningRef.current = true;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = speechLangForChat();

    rec.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
      setInfoMsg(t.voiceListening);
    };

    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const spoken = transcript.trim();
      pendingVoiceRef.current = spoken;
      setInputText(`${voicePrefixRef.current}${spoken}`.trim());
    };

    rec.onerror = (event) => {
      const code = event.error;
      if (code === 'aborted' || code === 'no-speech') return;
      wantListeningRef.current = false;
      setIsListening(false);
      setInfoMsg('');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setErrorMsg(t.voiceMicDenied);
      } else if (code === 'network') {
        setErrorMsg(t.voiceMicNetwork);
      } else {
        setErrorMsg(`${t.errorSpeechBlocked} (${code})`);
      }
    };

    rec.onend = () => {
      if (wantListeningRef.current) {
        try {
          rec.start();
          return;
        } catch {
          wantListeningRef.current = false;
        }
      }
      setIsListening(false);
      setInfoMsg('');
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      wantListeningRef.current = false;
      setIsListening(false);
      setErrorMsg(err.message || t.errorSpeechBlocked);
    }
  };

  // Text-To-Speech Synthesis helper
  const handleTTS = (text, messageId) => {
    if (!window.speechSynthesis) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any other speakings
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices();
    if (chatLang === 'en') {
      utterance.lang = 'en-US';
      const voice = voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
    } else {
      utterance.lang = 'bn-BD';
      const voice = voices.find(v => v.lang.startsWith('bn'));
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Stop current speaking when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Post message to backend gateway
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    await sendChatMessage(inputText);
  };

  // Re-Index FFWC PDFs
  const triggerReindexing = async () => {
    try {
      setErrorMsg('');
      setInfoMsg(language === 'en' ? 'Scanning PDF folder...' : 'পিডিএফ ফোল্ডার স্ক্যান হচ্ছে...');
      const response = await fetch(`http://localhost:5001/ai/reindex`, {
        method: 'POST'
      });
      if (response.ok) {
        setInfoMsg(language === 'en' ? 'Indexing complete. Cache updated!' : 'ইনডেক্সিং সম্পন্ন হয়েছে। ক্যাশ আপডেট হয়েছে!');
        fetchLogsAndStatus();
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to reindex PDF database.');
    }
  };

  const verifyApiKey = async (keyToTest) => {
    const key = String(keyToTest || '').trim();
    if (!key) {
      setKeyCheck({ status: 'failed', message: language === 'en' ? 'Paste an API key first.' : 'আগে একটি API কী লিখুন।' });
      return false;
    }

    setTestingKey(true);
    setKeyCheck({ status: 'testing', message: t.customKeyTesting });
    try {
      const response = await fetch(`${API_URL}/ai/test-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await response.json().catch(() => ({}));
      if (data.working) {
        setKeyCheck({
          status: 'working',
          message: `${t.customKeyWorking} ${data.provider ? `(${data.provider})` : ''} ${data.message ? `— ${data.message}` : ''}`.trim()
        });
        return true;
      }
      setKeyCheck({
        status: 'failed',
        message: data.message || t.customKeyFailed
      });
      return false;
    } catch (err) {
      setKeyCheck({
        status: 'failed',
        message: language === 'en'
          ? 'Could not reach the server to check this key. Is the backend running?'
          : 'কী যাচাই করতে সার্ভারে পৌঁছানো যায়নি। ব্যাকএন্ড চালু আছে কি?'
      });
      return false;
    } finally {
      setTestingKey(false);
    }
  };

  // Save custom key and report whether it works
  const handleSaveKey = async (e) => {
    e.preventDefault();
    const key = customApiKey.trim();
    localStorage.setItem('user_openai_key', key);
    const ok = await verifyApiKey(key);
    setInfoMsg(ok ? `${t.customKeySuccess} ${t.customKeyWorking}` : t.customKeySuccess);
  };

  // Clear Chat Logs
  const handleClearChat = async () => {
    // Standard visual wipe
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-flood-dark-950 text-slate-100 py-10 px-4 md:px-8 flex flex-col font-sans">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
        
        {/* Page Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-heading m-0 flex items-center gap-3">
              <Bot className="w-9 h-9 text-flood-cyan-400" />
              {t.pageTitle}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl font-medium">
              {t.pageSub}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isGovAdmin && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs font-bold border border-white/5 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-flood-cyan-400" />
                <span>{language === 'en' ? 'API Key Settings' : 'এপিআই কী সেটিংস'}</span>
              </button>
            )}
            <button
              onClick={triggerReindexing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs font-bold border border-white/5 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh RAG database cache"
            >
              <RefreshCw className="w-3.5 h-3.5 text-flood-cyan-400" />
              <span>{language === 'en' ? 'Reindex PDFs' : 'পিডিএফ রিইনডেক্স'}</span>
            </button>
          </div>
        </div>

        <div className="glass-panel p-4 md:px-5 md:py-4 rounded-2xl border border-white/5 bg-slate-900/40 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-center gap-2 sm:pb-2.5 shrink-0">
            <MapPin className="w-4 h-4 text-flood-cyan-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {language === 'en' ? 'Your location' : 'আপনার অবস্থান'}
            </span>
          </div>
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-semibold">
              {language === 'en' ? 'Latitude (N)' : 'অক্ষাংশ (N)'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="24.8949"
              className={coordFieldClass(latReady)}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-semibold">
              {language === 'en' ? 'Longitude (E)' : 'দ্রাঘিমাংশ (E)'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              placeholder="91.8687"
              className={coordFieldClass(lonReady)}
            />
          </label>
          <button
            type="button"
            onClick={captureCurrentLocation}
            disabled={locating}
            className="sm:w-auto w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-flood-cyan-500 hover:bg-flood-cyan-400 text-slate-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            <Compass className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            {locating ? t.locating : (language === 'en' ? 'Locate current location' : 'বর্তমান অবস্থান নিন')}
          </button>
        </div>

        {/* Configurations Drawer (Inline Card Panel) */}
        {isGovAdmin && showConfig && (
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-900/60 animate-slide-up flex flex-col gap-3">
            <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <Key className="w-4 h-4 text-flood-cyan-400" />
              {t.customKeyTitle}
            </h3>
            <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={t.customKeyPlaceholder}
                  value={customApiKey}
                  onChange={(e) => {
                    setCustomApiKey(e.target.value);
                    setKeyCheck({ status: 'idle', message: '' });
                  }}
                  autoComplete="off"
                  className="w-full px-4 py-2.5 pr-20 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-white placeholder-slate-600 outline-none focus:border-flood-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                  title={showApiKey ? (language === 'en' ? 'Hide key' : 'কী লুকান') : (language === 'en' ? 'Show key' : 'কী দেখুন')}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showApiKey ? (language === 'en' ? 'Hide' : 'লুকান') : (language === 'en' ? 'Show' : 'দেখুন')}
                </button>
              </div>
              <button
                type="submit"
                disabled={testingKey || !customApiKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white font-bold text-xs hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {testingKey ? t.customKeyTesting : t.customKeySave}
              </button>
            </form>
            {keyCheck.status !== 'idle' && (
              <div
                className={`flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 ${
                  keyCheck.status === 'working'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : keyCheck.status === 'testing'
                      ? 'bg-flood-cyan-500/10 border border-flood-cyan-500/20 text-flood-cyan-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                {keyCheck.status === 'working' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {keyCheck.status === 'failed' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                {keyCheck.status === 'testing' && (
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                )}
                <span>{keyCheck.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Global Notices */}
        {errorMsg && (
          <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm font-semibold flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
            <span>{errorMsg}</span>
          </div>
        )}
        {infoMsg && (
          <div className="glass-panel p-4 rounded-xl border border-flood-cyan-500/20 bg-flood-cyan-500/10 text-flood-cyan-400 text-sm font-semibold flex items-center gap-3 animate-fade-in">
            <Info className="w-5 h-5 flex-shrink-0 text-flood-cyan-400" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Main Grid: Left Side Chat Panel, Right Side RAG Status Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch flex-1">
          
          {/* RAG Status & Language accent controls Panel */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            
            {/* Status dashboard card */}
            <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-flood-cyan-400" />
                {t.statusTitle}
              </h3>
              
              {status ? (
                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">{t.statusIndexed}:</span>
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-flood-cyan-400" />
                      12 PDF Files
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">{t.statusChunks}:</span>
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-flood-cyan-400" />
                      {(status.total_chunks !== undefined ? status.total_chunks : (status.chunks_indexed !== undefined ? status.chunks_indexed : 0)).toLocaleString()} Chunks
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{t.statusMode}</span>
                    <span className={`text-[11px] font-semibold mt-1 flex items-center gap-1.5 ${
                      status.status === 'offline' ? 'text-rose-400' : status.status === 'starting' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {status.status === 'offline' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      ) : status.status === 'starting' ? (
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {status.mode}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 font-medium">
                  <div className="w-4 h-4 border border-t-flood-cyan-500 border-transparent rounded-full animate-spin mx-auto mb-1"></div>
                  {language === 'en' ? 'Updating status logs...' : 'ইনডেক্সিং স্ট্যাটাস লোড হচ্ছে...'}
                </div>
              )}
            </div>

            {/* Dialect settings card */}
            <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
                {t.dialectLabel}
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setChatLang('en')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                    chatLang === 'en'
                      ? 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 border-transparent text-white shadow-lg'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-flood-cyan-400/20'
                  }`}
                >
                  {t.englishAccent}
                </button>
                <button
                  onClick={() => setChatLang('bn')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                    chatLang === 'bn'
                      ? 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 border-transparent text-white shadow-lg'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-flood-cyan-400/20'
                  }`}
                >
                  {t.banglaAccent}
                </button>
                <button
                  onClick={() => setChatLang('sylheti')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                    chatLang === 'sylheti'
                      ? 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 border-transparent text-white shadow-lg'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-flood-cyan-400/20'
                  }`}
                >
                  {t.sylhetiAccent}
                </button>
                <button
                  onClick={() => setChatLang('chittagonian')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                    chatLang === 'chittagonian'
                      ? 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 border-transparent text-white shadow-lg'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-flood-cyan-400/20'
                  }`}
                >
                  {t.chittagonianAccent}
                </button>
              </div>
            </div>

          </div>

          {/* Chat Interface Panel */}
          <div className="lg:col-span-3 glass-panel rounded-3xl border border-white/5 bg-slate-900/30 overflow-hidden flex flex-col h-[650px] relative">
            
            {/* Header controls bar inside chat window */}
            <div className="px-6 py-4 border-b border-white/5 bg-slate-900/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-flood-blue-600 to-flood-cyan-400 text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white m-0">
                    {language === 'en' ? 'FloodShield Local Dispatch AI' : 'ফ্লাডশিল্ড এআই কন্ট্রোলার'}
                  </h3>
                  <span className={`text-[9px] uppercase font-bold tracking-wider flex items-center gap-1.5 mt-0.5 ${
                    status?.status === 'offline' ? 'text-rose-400' : status?.status === 'starting' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      status?.status === 'offline' ? 'bg-rose-500' : status?.status === 'starting' ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}></span>
                    {status?.status === 'offline'
                      ? (language === 'en' ? 'ML offline · backup chat' : 'এমএল অফলাইন · ব্যাকআপ চ্যাট')
                      : status?.status === 'starting'
                        ? (language === 'en' ? 'Starting AI engine…' : 'এআই ইঞ্জিন চালু হচ্ছে…')
                        : status?.backendFallback
                          ? (language === 'en' ? 'Live backup chat online' : 'লাইভ ব্যাকআপ চ্যাট চালু')
                          : status?.openrouter
                            ? (language === 'en' ? 'OpenRouter · RAG Active' : 'OpenRouter · RAG সক্রিয়')
                            : (language === 'en' ? 'RAG Engine Online' : 'RAG ইঞ্জিন অনলাইন')
                    }
                  </span>
                </div>
              </div>

              <button
                onClick={handleClearChat}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title={t.clearBtn}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'en' ? 'Clear Logs' : 'চ্যাট মুছুন'}</span>
              </button>
            </div>

            {/* Chat conversation area */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 no-scrollbar" style={{ overflowAnchor: 'none' }}>
              {loadingHistory ? (
                <div className="flex-1 flex flex-col justify-center items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 rounded-full border-2 border-t-flood-cyan-500 border-slate-800 animate-spin"></div>
                  <p className="text-xs font-semibold">{language === 'en' ? 'Syncing chat logs...' : 'বার্তা ইতিহাস সিঙ্ক হচ্ছে...'}</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 gap-5">
                  <Bot className="w-16 h-16 text-slate-700 animate-float" />
                  <div>
                    <h4 className="text-base font-bold text-white font-heading">
                      {language === 'en' ? 'Start Factual AI Briefing Session' : 'এআই তথ্য সেশন শুরু করুন'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      {language === 'en' 
                        ? 'I have parsed and indexed FFWC annual reports from 2010 to 2021. Try querying specific records below.' 
                        : 'আমি ২০১০ থেকে ২০২১ সাল পর্যন্ত বার্ষিক বন্যা রিপোর্ট সংকলন করেছি। নিচে আপনার প্রশ্ন জিজ্ঞেস করুন।'}
                    </p>
                  </div>

                  {/* Sample Question Pills */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-2">
                    {t.sampleQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputText(q)}
                        className="px-3.5 py-2 rounded-xl bg-slate-950 border border-white/5 hover:border-flood-cyan-500/25 text-[10px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                history.map((msg, idx) => {
                  const isAi = msg.sender === 'ai';
                  return (
                    <div 
                      key={String(msg._id || `msg-${idx}`)}
                      className={`flex flex-col max-w-[85%] ${isAi ? 'self-start items-start' : 'self-end items-end'}`}
                    >
                      <div className="text-[9px] font-semibold text-slate-500 mb-1 px-1">
                        {isAi ? 'FloodShield AI' : 'You'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className={`p-4 rounded-3xl text-sm relative border transition-all duration-300 group ${
                        isAi 
                          ? 'bg-slate-900/80 border-white/5 text-slate-200 rounded-tl-sm' 
                          : 'bg-gradient-to-br from-flood-blue-700/80 to-flood-cyan-600/80 border-transparent text-white rounded-tr-sm shadow-md shadow-flood-blue-600/5'
                      }`}>
                        
                        {/* Message content */}
                        <div className="whitespace-pre-line leading-relaxed text-xs">
                          {msg.message}
                        </div>

                        {/* AI tools (TTS & Model info) */}
                        {isAi && (
                          <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-3.5 text-[9px] text-slate-500 font-semibold gap-4">
                            <span className="flex items-center gap-1.5">
                              {msg.modelUsed?.includes('OpenRouter') ? (
                                <span className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/20 text-emerald-400 font-bold text-[8px] uppercase tracking-wider">
                                    OpenRouter
                                  </span>
                                  <span className="text-slate-500">{msg.modelUsed.split(' via')[0]}</span>
                                </span>
                              ) : (
                                <span>Engine: {msg.modelUsed || 'Local Fallback'}</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTTS(msg.message, msg._id)}
                                className={`p-1 rounded bg-slate-950 border border-white/5 transition-colors cursor-pointer ${
                                  speakingMessageId === msg._id 
                                    ? 'text-rose-400 hover:text-rose-300' 
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title={speakingMessageId === msg._id ? t.stopSpeech : t.readAloud}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Display context sources attribution link below AI message */}
                      {isAi && msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
                          <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" />
                            {t.sourceBadge}:
                          </span>
                          {msg.sources.map((src, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => setSelectedSource(src)}
                              className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-900 border border-white/5 text-[9px] font-bold text-flood-cyan-400 hover:text-white transition-colors cursor-pointer"
                              title={`Similarity: ${src.score}`}
                            >
                              {src.source} (p. {src.page})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing Loader animation when waiting response */}
              {sending && (
                <div className="self-start flex flex-col max-w-[80%]">
                  <div className="text-[9px] font-semibold text-slate-500 mb-1 px-1">FloodShield AI is typing...</div>
                  <div className="px-4 py-3 rounded-2xl bg-slate-900/60 border border-white/5 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-flood-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-flood-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-flood-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Selected source detailed panel overlay */}
            {selectedSource && (
              <div className="absolute inset-x-0 bottom-[75px] z-20 glass-panel p-4 border-t border-white/10 bg-slate-950/90 text-left flex flex-col gap-2 animate-slide-up">
                <div className="flex justify-between items-center border-b border-white/5 pb-1">
                  <span className="text-[10px] font-black uppercase text-flood-cyan-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {selectedSource.source} • Page {selectedSource.page} (Match Score: {selectedSource.score})
                  </span>
                  <button 
                    onClick={() => setSelectedSource(null)}
                    className="text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-wider cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 italic">
                  "{selectedSource.text}"
                </p>
              </div>
            )}

            {/* Chat query text input and voice triggers */}
            <div className="px-6 py-4 border-t border-white/5 bg-slate-900/40">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
                
                {/* Voice Recorder Dictation trigger */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? t.voiceMicStop : t.voiceMicTitle}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse'
                      : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white hover:border-flood-cyan-500/20'
                  }`}
                >
                  {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isListening ? t.voiceListening : t.inputPlaceholder}
                  disabled={isListening}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-600 outline-none focus:border-flood-cyan-400 disabled:opacity-50 transition-colors"
                />

                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="p-3 rounded-xl bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white font-bold hover:shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
