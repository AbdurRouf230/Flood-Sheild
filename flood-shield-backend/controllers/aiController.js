const axios = require('axios');
const dbStore = require('../utils/dbStore');

const PYTHON_ML_URL = String(process.env.PYTHON_ML_URL || 'http://127.0.0.1:5001')
  .replace('://localhost', '://127.0.0.1');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pingMlHealth = (timeout = 2500) => axios.get(`${PYTHON_ML_URL}/health`, { timeout });

const isMlUnreachable = (err) => {
  const code = err?.code || '';
  return ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
};

const tryMlHealthOnce = async (timeout = 2500) => {
  try {
    await pingMlHealth(timeout);
    return true;
  } catch (err) {
    return { ok: false, unreachable: isMlUnreachable(err), err };
  }
};

const wakeMlService = async () => {
  const first = await tryMlHealthOnce(2500);
  if (first === true) return true;
  if (first.unreachable) return false;
  await sleep(4000);
  return (await tryMlHealthOnce(10000)) === true;
};

const pokeMlInBackground = () => {
  pingMlHealth(4000).catch(() => {});
};

setInterval(pokeMlInBackground, 8 * 60 * 1000);

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const a1 = Number(lat1);
  const b1 = Number(lon1);
  const a2 = Number(lat2);
  const b2 = Number(lon2);
  if (![a1, b1, a2, b2].every(Number.isFinite)) return null;
  const R = 6371;
  const dLat = (a2 - a1) * Math.PI / 180;
  const dLon = (b2 - b1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * Math.PI / 180) * Math.cos(a2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isPeopleShelter = (s) => {
  const name = String(s.name || '');
  return !/\[Hub\]/i.test(name);
};

const loadRankedShelters = async (lat, lon, district) => {
  let shelters = [];
  try {
    shelters = await dbStore.findShelters();
  } catch (e) {
    console.warn('[AI] findShelters failed:', e.message);
  }
  const list = (shelters || []).filter((s) => s.active !== false && isPeopleShelter(s));
  const scored = list.map((s) => {
    const dist = haversineKm(lat, lon, s.lat ?? s.latitude, s.lon ?? s.longitude);
    return { ...s, distanceKm: dist };
  });
  scored.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    const d = String(district || '').toLowerCase();
    const aMatch = d && String(a.district || '').toLowerCase() === d;
    const bMatch = d && String(b.district || '').toLowerCase() === d;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
  return scored;
};

const formatShelterLine = (s) => {
  const dist = s.distanceKm != null ? `${s.distanceKm.toFixed(2)} km` : 'distance n/a';
  const phone = s.phone || 'N/A';
  const cap = s.capacity != null ? `capacity ${s.capacity}` : '';
  return `- ${s.name} (${s.district || 'Bangladesh'}) · ${dist}${cap ? ` · ${cap}` : ''} · ${phone}`;
};

const answerFromPlatform = (query, language, user, ranked, outputType) => {
  const q = String(query || '').toLowerCase();
  const shelterAsk = outputType === 'shelter' || /shelter|আশ্রয়|আশ্রয়|ashray|nearest|নিকট|where should i go|safe place/.test(q);
  const top = ranked.slice(0, 3);
  if (!shelterAsk || top.length === 0) return null;

  const lines = top.map(formatShelterLine).join('\n');
  const district = user?.district || user?.allocatedArea || '';
  if (language === 'bn' || language === 'sylheti') {
    return `আপনার জন্য নিকটস্থ সরকারি আশ্রয়কেন্দ্র:\n${lines}\n\nজরুরি হলে ৯৯৯-এ কল করুন।${district ? ` হোম জেলা: ${district}.` : ''}`;
  }
  return `Nearest Flood Shield shelters for you:\n${lines}\n\nIf this is an emergency, call 999.${district ? ` Home district on file: ${district}.` : ''}`;
};

const OPENROUTER_MODELS = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free'
];

const dialectInstruction = (language, outputType) => {
  let dialect = 'Respond in clean, helpful English.';
  if (language === 'bn') dialect = 'Respond in standard, formal Bangla language. Use proper Bengali grammar.';
  else if (language === 'sylheti') dialect = 'Respond entirely in the Sylheti dialect (সিলেটি উপভাষা) but write in the Bengali script.';
  else if (language === 'chittagonian') dialect = 'Respond entirely in the Chittagonian dialect (চাটগাঁইয়া উপভাষা) and write in the Bengali script.';

  let mode = 'Provide a simple, clear, conversational explanation of the situation or facts requested.';
  if (outputType === 'safety') mode = 'Format your answer as a structured bulleted emergency checklist.';
  else if (outputType === 'shelter') mode = 'Focus on recommending nearby shelter actions.';
  return `${dialect} ${mode}`;
};

const completeWithLlm = async ({ query, language, outputType, openrouterKey, openaiKey, liveContext }) => {
  const systemPrompt = [
    "You are 'FloodShield AI Assistant', a helpful emergency dispatcher in Bangladesh.",
    'Answer using live FloodShield situation data when provided, then general Bangladesh flood safety.',
    'Never say you cannot see the user location when coordinates are present.',
    `Dialect & Format Rule: ${dialectInstruction(language, outputType)}`,
    liveContext || 'No live situation snapshot was provided.'
  ].join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
  ];

  if (openrouterKey) {
    for (const model of OPENROUTER_MODELS) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          { model, messages, max_tokens: 700, temperature: 0.3 },
          {
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://flood-shield.app',
              'X-Title': 'FloodShield RAG Assistant'
            },
            timeout: 25000
          }
        );
        const msg = response.data?.choices?.[0]?.message || {};
        const content = String(msg.content || msg.reasoning_content || '').trim();
        if (content) {
          return { text: content, model: `${model.split('/').pop()} via OpenRouter` };
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 429 || status === 404) continue;
        console.warn(`[Node Backend] OpenRouter ${model} failed: ${err.message}`);
      }
    }
  }

  if (openaiKey) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { model: 'gpt-4o-mini', messages, max_tokens: 512, temperature: 0.3 },
        {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );
      const content = String(response.data?.choices?.[0]?.message?.content || '').trim();
      if (content) {
        return { text: content, model: 'GPT-4o-Mini (OpenAI)' };
      }
    } catch (err) {
      console.warn(`[Node Backend] OpenAI fallback failed: ${err.message}`);
    }
  }

  return null;
};

const cannedOfflineReply = (language, outputType) => {
  if (language === 'bn') {
    if (outputType === 'safety') {
      return 'বন্যা পরিস্থিতির জন্য জরুরি নিরাপত্তা নির্দেশনাবলী:\n১. মূল্যবান নথিপত্র এবং জরুরি ওষুধ প্লাস্টিক ব্যাগে ওয়াটারপ্রুফ করে রাখুন।\n২. নিকটবর্তী আশ্রয়কেন্দ্রের অবস্থান জেনে রাখুন এবং বিদ্যুৎ সংযোগ বিচ্ছিন্ন করুন।\n৩. বিশুদ্ধ খাবার পানি এবং শুকনো খাবার মজুত রাখুন।';
    }
    if (outputType === 'shelter') {
      return 'নিকটবর্তী আশ্রয়কেন্দ্রের তালিকা:\n- সিলেট সরকারি কলেজ আশ্রয়কেন্দ্র (সিলেট সদর)\n- সুনামগঞ্জ সদর উচ্চ বিদ্যালয় (সুনামগঞ্জ)\n- কুড়িগ্রাম ডিগ্রি কলেজ আশ্রয়কেন্দ্র\nআবহাওয়ার অবনতি ঘটলে দ্রুত নিকটস্থ সরকারি আশ্রয়কেন্দ্রে চলে যান।';
    }
    return 'আমি এই মুহূর্তে অফলাইনে রয়েছি। বন্যা সংক্রান্ত জরুরি তথ্যের জন্য স্থানীয় কন্ট্রোল রুম বা ৯৯৯ এ যোগাযোগ করুন।';
  }
  if (language === 'sylheti') {
    return 'আমি এখন অফলাইনে আছি ভাই। সিলেটের বন্যা পরিস্থিতি নিয়া FFWC পেইজে চোখ রাখো অথবা ৯৯৯ এ কল দেও। নিরাপদে থাকো।';
  }
  if (language === 'chittagonian') {
    return 'আঁই এইক্কা অফলাইনে আছি রে ভাই। চট্টগ্রামের পানির অবস্তা বুজিবার লাই FFWC ওয়েরসাইটত চাঅ আর মরণত পড়িলে ৯৯৯ অত কল গরঅ। নিরাপদে থাঅ।';
  }
  if (outputType === 'safety') {
    return 'Emergency Safety Guidelines:\n1. Keep important documents and medications sealed in waterproof bags.\n2. Disconnect electricity main switches if water rises.\n3. Secure clean drinking water and dry food rations.';
  }
  if (outputType === 'shelter') {
    return 'Recommended Cyclone/Flood Shelters nearby:\n- Sylhet Govt College Shelter (Sylhet Sadar)\n- Sunamganj Sadar High School Shelter (Sunamganj)\n- Dhaka Central Cyclone Center (Capacity: 2500)';
  }
  return 'I am currently running in offline mode. For active flood alerts, refer to FFWC reports, keep dry supplies stocked, and dial 999 in an emergency.';
};

// GET /api/ai/history
const getHistory = async (req, res) => {
  try {
    const userId = req.user.uid;
    const history = await dbStore.findChatHistory(userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving chat history', error: error.message });
  }
};

// POST /api/ai/message
const postMessage = async (req, res) => {
  const userId = req.user.uid;
  const { message, language = 'en', outputType = 'explanation' } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'User message is required.' });
  }

  try {
    // 1. Save user's message
    await dbStore.saveChatMessage({
      userId,
      sender: 'user',
      message: message.trim(),
      language,
      outputType
    });

    let aiResponseText = '';
    let sourcesList = [];
    let providerUsed = 'Llama-3-8B-Instruct (RAG Index)';

    const userKey = String(req.headers['x-openai-key'] || '').trim();
    const userIsOpenRouter = userKey.startsWith('sk-or-');
    const openrouterKey = userIsOpenRouter ? userKey : (process.env.OPENROUTER_API_KEY || '');
    const openaiKey = (!userIsOpenRouter && userKey) ? userKey : '';
    const lat = req.body.latitude;
    const lon = req.body.longitude;
    const userDistrict = req.body.district || req.user.district || req.user.allocatedArea || '';
    const hasCoords = lat !== undefined && lat !== null && lat !== '' && lon !== undefined && lon !== null && lon !== '';
    const rankedShelters = await loadRankedShelters(hasCoords ? lat : null, hasCoords ? lon : null, userDistrict);
    const shelterContext = rankedShelters.slice(0, 5).map(formatShelterLine).join('\n');
    const locatedQuestion = hasCoords
      ? `IMPORTANT: You already know this user's live coordinates. They are latitude ${lat}, longitude ${lon}. Home district on file: ${userDistrict || 'unknown'}. Never say you cannot see their location. If they ask where they are, repeat these coordinates and the closest shelter.\n\nUser question: ${message.trim()}`
      : message.trim();
    const liveContext = [
      `LIVE FLOODSHIELD SITUATION: user ${req.user.name || 'resident'} (${req.user.role || 'Citizen'}). Home district: ${userDistrict || 'unknown'}.`,
      hasCoords ? `Coordinates: ${lat}, ${lon}.` : '',
      shelterContext ? `Known shelters:\n${shelterContext}` : ''
    ].filter(Boolean).join(' ');

    const mlUp = await wakeMlService();
    pokeMlInBackground();

    try {
      if (!mlUp) throw new Error('ML service unreachable');

      const response = await axios.post(`${PYTHON_ML_URL}/ai/chat`, {
        message: locatedQuestion,
        language,
        outputType,
        openrouterKey,
        openaiKey,
        user: {
          name: req.user.name,
          role: req.user.role,
          district: userDistrict,
          allocatedArea: req.user.allocatedArea || ''
        },
        latitude: hasCoords ? lat : null,
        longitude: hasCoords ? lon : null
      }, { timeout: 25000 });

      if (response.data && response.data.status === 'success' && response.data.response) {
        aiResponseText = response.data.response;
        sourcesList = response.data.sources || [];
        providerUsed = response.data.modelUsed || providerUsed;
      } else {
        throw new Error(response.data?.error || 'Invalid response from ML service');
      }
    } catch (mlErr) {
      console.warn(`[Node Backend] Python ML AI Chat service offline/error: ${mlErr.code || mlErr.message}. Trying direct LLM...`);

      const llm = await completeWithLlm({
        query: locatedQuestion,
        language,
        outputType,
        openrouterKey,
        openaiKey,
        liveContext
      });

      if (llm) {
        aiResponseText = llm.text;
        sourcesList = rankedShelters.slice(0, 3).map(s => s.name);
        providerUsed = llm.model;
      } else {
        const platform = answerFromPlatform(message.trim(), language, req.user, rankedShelters, outputType);
        if (platform) {
          aiResponseText = platform;
          sourcesList = rankedShelters.slice(0, 3).map(s => s.name);
          providerUsed = 'Flood Shield live shelter registry';
        } else {
          providerUsed = 'Flood Shield safety briefing';
          sourcesList = ['Government Disaster Guidelines', 'FFWC Safety Directive'];
          aiResponseText = cannedOfflineReply(language, outputType);
        }
      }
    }

    // 3. Save AI's response message
    const savedAiMsg = await dbStore.saveChatMessage({
      userId,
      sender: 'ai',
      message: aiResponseText,
      language,
      outputType
    });

    res.status(201).json({
      message: savedAiMsg,
      sources: sourcesList,
      modelUsed: providerUsed
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process AI chat message', error: error.message });
  }
};

// GET /api/ai/status
const getSystemStatus = async (req, res) => {
  pokeMlInBackground();
  try {
    const awake = await wakeMlService();
    if (awake) {
      const response = await axios.get(`${PYTHON_ML_URL}/ai/status`, { timeout: 8000 });
      return res.json(response.data);
    }
  } catch (error) {
    console.warn(`[Node Backend] Python ML status check failed: ${error.message}`);
  }
  res.json({
    status: 'success',
    backendFallback: true,
    indexed: true,
    documents_parsed: 12,
    chunks_indexed: 0,
    total_chunks: 0,
    mode: process.env.OPENROUTER_API_KEY
      ? 'Live backup chat (OpenRouter + shelter registry)'
      : 'Live backup chat (shelter registry)',
    openrouter: Boolean(process.env.OPENROUTER_API_KEY)
  });
};

// POST /api/ai/test-key — check whether a pasted OpenRouter or OpenAI key is valid
const testApiKey = async (req, res) => {
  const key = String(req.body?.apiKey || req.headers['x-openai-key'] || '').trim();
  if (!key) {
    return res.status(400).json({ working: false, provider: '', message: 'Paste an API key first.' });
  }

  const isOpenRouter = key.startsWith('sk-or-');
  const provider = isOpenRouter ? 'OpenRouter' : 'OpenAI';

  try {
    if (isOpenRouter) {
      const response = await axios.get('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 12000
      });
      if (response.status === 200) {
        return res.json({
          working: true,
          provider,
          message: 'OpenRouter key is valid and working.'
        });
      }
    } else {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        timeout: 12000
      });
      if (response.status === 200) {
        return res.json({
          working: true,
          provider,
          message: 'OpenAI key is valid and working.'
        });
      }
    }
    return res.json({ working: false, provider, message: `${provider} rejected this key.` });
  } catch (error) {
    const status = error.response?.status;
    let message = `${provider} key is not working.`;
    if (status === 401 || status === 403) {
      message = `This ${provider} key is invalid or expired.`;
    } else if (status === 429) {
      return res.json({
        working: true,
        provider,
        message: `${provider} key is valid, but the account is rate-limited right now.`
      });
    } else if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      message = `Could not reach ${provider} to check the key. Check your internet and try again.`;
    }
    return res.json({ working: false, provider, message });
  }
};

module.exports = {
  getHistory,
  postMessage,
  getSystemStatus,
  testApiKey
};
