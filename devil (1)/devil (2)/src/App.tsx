import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, RefreshCw, Zap, Users, Flame, Check, LogOut, ExternalLink, HelpCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';

// ==========================================
// CONFIGURATIONS & ASSETS
// ==========================================
const GOOD_APPLE_IMG = 'https://b.top4top.io/p_36305byzd1.jpg';
const BAD_APPLE_IMG = 'https://c.top4top.io/p_3630bvfr81.jpg';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlX1ASvDrf5BBtaB72AUYqSoW34YvP_y4",
  authDomain: "mrwan-dd795.firebaseapp.com",
  databaseURL: "https://mrwan-dd795-default-rtdb.firebaseio.com",
  projectId: "mrwan-dd795",
  storageBucket: "mrwan-dd795.firebasestorage.app",
  messagingSenderId: "12538399995",
  appId: "1:12538399995:web:4a7e6b40f611891fecb45e",
  measurementId: "G-KBTHXXDYBL"
};

const firebaseApp = initializeApp(firebaseConfig);
const rtdb = getDatabase(firebaseApp);

const TARGET_ROWS = [
  { mult: "349.68", row: 9, label: "x349.68" }, // Top row (Very hard, 1 safe)
  { mult: "69.93",  row: 8, label: "x69.93" },
  { mult: "27.92",  row: 7, label: "x27.92" },
  { mult: "11.18",  row: 6, label: "x11.18" },
  { mult: "6.71",   row: 5, label: "x6.71" },
  { mult: "4.02",   row: 4, label: "x4.02" },
  { mult: "2.41",   row: 3, label: "x2.41" },
  { mult: "1.93",   row: 2, label: "x1.93" },
  { mult: "1.54",   row: 1, label: "x1.54" },
  { mult: "1.23",   row: 0, label: "x1.23" }, // Bottom row (Easy, 4 safe)
];

// Synthesis helper for high-quality game audio
const playSynthSound = (type: 'click' | 'success' | 'fail' | 'reveal') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'reveal') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn("Audio Context blocked or not supported:", e);
  }
};

export default function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginId, setLoginId] = useState<string>('');
  const [activationCode, setActivationCode] = useState<string>('');
  
  // Stats
  const [guessNumber, setGuessNumber] = useState<number>(0);
  const [onlineCount, setOnlineCount] = useState<number>(1349);
  
  // Game Predictions Data
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [revealedRows, setRevealedRows] = useState<number[]>([]);

  // ==========================================
  // INITIALIZATION & DYNAMIC EFFECT
  // ==========================================
  useEffect(() => {
    // Load local storage values if any
    const savedUserId = localStorage.getItem('loggedInUserId');
    if (savedUserId) {
      setLoginId(savedUserId);
      setIsLoggedIn(true);
    }

    const savedGuessNum = localStorage.getItem('guessNumber');
    if (savedGuessNum) {
      setGuessNumber(parseInt(savedGuessNum));
    }

    // Online users dynamic tick counter
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2; // fluctuates slightly (-2 to +2)
        const next = Math.max(1300, prev + delta);
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Save guesses when they change
  useEffect(() => {
    localStorage.setItem('guessNumber', guessNumber.toString());
  }, [guessNumber]);

  // ==========================================
  // PREDICTION GENERATOR
  // ==========================================
  const generatePredictions = async () => {
    const finalObject: Record<string, any> = {};

    // نمر على 10 صفوف (من 0 إلى 9)
    for (let r = 0; r < 10; r++) {
      // تحديد عدد التفاحات السليمة بالصف بناء على رقم الصف
      let safeCount = 4;
      if (r >= 4 && r < 7) safeCount = 3;      // الصفوف 4، 5، 6
      if (r >= 7 && r < 9) safeCount = 2;      // الصفوف 7، 8
      if (r >= 9) safeCount = 1;               // الصف التاسع والأخير

      // تحديد أماكن التفاح السليم بشكل عشوائي داخل الأعمدة الـ 5
      const safeCols: number[] = [];
      while (safeCols.length < safeCount) {
        const randomCol = Math.floor(Math.random() * 5); // اختيار عمود عشوائي من 0 إلى 4
        if (!safeCols.includes(randomCol)) {
          safeCols.push(randomCol);
        }
      }

      // كتابة القيم للخانة (تحويل الصف والعمود لرمز الخانة من 1 لـ 50)
      for (let c = 0; c < 5; c++) {
        const mIndex = r * 5 + c + 1; // المعادلة السحرية لحساب رقم الخانة الفريد
        const value = safeCols.includes(c) ? "1" : "0"; // 1 = سليمة، 0 = تالفة
        
        // الهيكل المعتمد داخل قاعدة البيانات
        finalObject[`m${mIndex}`] = { [`m${mIndex}`]: value };
      }
    }

    try {
      // الآن نقوم برفع الكائن بالكامل إلى قاعدة البيانات تحت m11
      const rRef = ref(rtdb, 'm11');
      await set(rRef, finalObject);
    } catch (error) {
      console.error("Failed to write to Firebase database:", error);
    }

    return finalObject;
  };

  const isSafeApple = (rowIdx: number, colIdx: number) => {
    if (!predictions || Object.keys(predictions).length === 0) return false;
    
    // 1. حساب الرقم التسلسلي للخانة
    const mIndex = rowIdx * 5 + colIdx + 1;
    const mKey = `m${mIndex}`;
    
    // 2. قراءة الكائن المقابل للخانة من التوقعات المجلوبة
    const mObj = (predictions as any)[mKey];
    
    // 3. التحقق من القيمة والتأكد أنها تساوي "1"
    if (mObj && typeof mObj === 'object' && mObj[mKey] === "1") {
      return true; // التفاحة سليمة!
    }
    
    return false; // التفاحة تالفة
  };

  // ==========================================
  // USER ACTIONS & TRIGGERS
  // ==========================================
  
  const validateID = (val: string) => {
    return val.replace(/[^0-9]/g, '');
  };

  const showPlatformConnectionDialog = (platformName: string) => {
    Swal.fire({
      title: 'جاري الاتصال بالسيرفر',
      html: `⏳ <b>${platformName}</b> <br> جاري التوصيل بالخادم وتهيئة البيانات...`,
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: 'custom-swal',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-text'
      },
      didOpen: () => {
        Swal.showLoading();
      },
      willClose: () => {
        Swal.fire({
          title: 'تم الاتصال بنجاح!',
          html: `✅ تم الاتصال بسيرفر <b>${platformName}</b> بنجاح وتهيئة البيانات`,
          icon: 'success',
          confirmButtonText: 'تم',
          confirmButtonColor: '#FF0800',
          customClass: {
            popup: 'custom-swal custom-swal-success',
            title: 'custom-swal-title custom-swal-title-success',
            htmlContainer: 'custom-swal-text',
            confirmButton: 'custom-swal-btn custom-swal-btn-success'
          },
          timer: 1800,
          timerProgressBar: true,
        });
      }
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    playSynthSound('click');

    const cleanId = loginId.trim();
    if (!cleanId || !cleanId.startsWith('1') || cleanId.length !== 10) {
      Swal.fire({
        title: 'خطأ في الدخول!',
        html: '🚫 عذراً، هذا الحساب غير مسجل!<br>يرجى التأكد من رقم ID الخاص بك.<br>يجب أن يبدأ ID برقم <b>1</b> ويتكون من 10 أرقام بالضبط.',
        icon: 'error',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#FF0800',
        customClass: {
          popup: 'custom-swal',
          title: 'custom-swal-title',
          htmlContainer: 'custom-swal-text',
          confirmButton: 'custom-swal-btn'
        }
      });
      playSynthSound('fail');
      return;
    }

    if (activationCode.trim().toLowerCase() !== 'm8ro') {
      Swal.fire({
        title: 'كود التفعيل خاطئ!',
        html: '❌ كود التفعيل الذي أدخلته غير صحيح.<br>يرجى إدخال الرمز الترويجي الصحيح <b>m8ro</b> لدخول الخدمة.',
        icon: 'error',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#FF0800',
        customClass: {
          popup: 'custom-swal',
          title: 'custom-swal-title',
          htmlContainer: 'custom-swal-text',
          confirmButton: 'custom-swal-btn'
        }
      });
      playSynthSound('fail');
      return;
    }

    // Success login
    localStorage.setItem('loggedInUserId', cleanId);
    Swal.fire({
      title: 'تم الدخول بنجاح!',
      html: '🎉 مرحباً بك في خادم تخمين AL-MARO التفاحة.',
      icon: 'success',
      timer: 1500,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: {
        popup: 'custom-swal custom-swal-success',
        title: 'custom-swal-title custom-swal-title-success',
        htmlContainer: 'custom-swal-text'
      }
    });

    setTimeout(() => {
      setIsLoggedIn(true);
      playSynthSound('success');
    }, 1500);
  };

  const handleLogout = () => {
    playSynthSound('click');
    Swal.fire({
      title: 'هل تريد تسجيل الخروج؟',
      text: 'سيتم مسح بيانات الجلسة الحالية وتأمين الخروج.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، خروج',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#FF0800',
      cancelButtonColor: '#1e293b',
      customClass: {
        popup: 'custom-swal',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-text',
        confirmButton: 'custom-swal-btn'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('loggedInUserId');
        setIsLoggedIn(false);
        setPredictions({});
        setRevealedCells({});
        setRevealedRows([]);
        playSynthSound('click');
      }
    });
  };

  const handleGuessPrediction = async () => {
    if (isProcessing) return;

    // Play initial sound
    playSynthSound('click');
    setIsProcessing(true);
    setRevealedRows([]);

    // 1. Simulate server connection dialog with SweetAlert
    Swal.fire({
      title: 'اتصال بخادم تخمين AL-MARO',
      html: '⏳ جاري الاتصال وقراءة بيانات m11...',
      timer: 1800,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: false,
      customClass: {
        popup: 'custom-swal',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-text'
      },
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Generate and upload predictions to Firebase m11 path
    const generatedPreds = await generatePredictions();

    // Fetch the predictions back from Firebase 'm11' node to ensure strict database roundtrip
    let finalPreds = generatedPreds;
    try {
      const dbRef = ref(rtdb, 'm11');
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        finalPreds = snapshot.val();
      }
    } catch (error) {
      console.error("Failed to retrieve predictions from Firebase, falling back to local:", error);
    }

    // After server setup wait, show successful prediction trigger
    setTimeout(() => {
      setPredictions(finalPreds || {});
      setGuessNumber(prev => prev + 1);

      Swal.fire({
        title: 'تم سحب التخمين!',
        html: `✅ تم جلب وقراءة بيانات m11 بنجاح.`,
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
        customClass: {
          popup: 'custom-swal custom-swal-success',
          title: 'custom-swal-title custom-swal-title-success',
          htmlContainer: 'custom-swal-text'
        }
      });

      // Sequential wave reveal from bottom row to top row (staggered animation)
      TARGET_ROWS.slice().reverse().forEach((rowInfo, idx) => {
        setTimeout(() => {
          setRevealedRows(prev => [...prev, rowInfo.row]);
          playSynthSound('reveal');
          
          // If this is the last row revealed (the top-most row info)
          if (idx === TARGET_ROWS.length - 1) {
            setIsProcessing(false);
            setTimeout(() => {
              playSynthSound('success');
            }, 500);
          }
        }, idx * 280); // Stagger by 280ms per row
      });

    }, 1800);
  };

  // ==========================================
  // RENDER INTERFACE
  // ==========================================
  return (
    <div 
      className="min-h-screen w-full flex flex-col justify-start items-center relative overflow-x-hidden select-none bg-black py-4 px-4 sm:px-6 md:px-8"
      style={{
        backgroundImage: "radial-gradient(circle at center, rgba(13, 20, 45, 0.85) 0%, rgba(2, 3, 10, 0.98) 100%), url('https://i.top4top.io/p_3630bkc2j1.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* Background glow animations */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        
        {/* LOGIN SCREEN */}
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex flex-col items-center py-6"
            >
              {/* Header Badges */}
              <div className="w-full flex justify-between items-center px-2 mb-8">
                <div className="border border-red-600/40 bg-black/60 px-4 py-1.5 rounded-full text-xs font-mono tracking-widest text-red-500 shadow-[0_0_12px_rgba(255,8,0,0.2)] backdrop-blur-md">
                  VERSION <span className="text-white font-bold">1.0.0</span>
                </div>
                
                <div className="border border-red-600/40 bg-black/60 px-4 py-1.5 rounded-full text-xs font-mono text-red-500 flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,8,0,0.2)] backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  ONLINE: <span className="text-white font-bold animate-pulse">{onlineCount}</span>
                </div>
              </div>

              {/* Title Header */}
              <h1 className="text-4xl font-extrabold tracking-tight text-center mb-1 text-white">
                AL-MARO <span className="text-amber-500">SERVER</span>
              </h1>
              <p className="text-xs text-center text-gray-400 mb-8 max-w-xs leading-relaxed font-light">
                نظام كشف التوقعات المتقدم للعبة تفاحة الحظ 🍎
              </p>


              {/* Login Form */}
              <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 bg-slate-950/40 border border-red-600/35 p-6 sm:p-8 rounded-3xl shadow-[0_0_35px_rgba(255,8,0,0.15)] backdrop-blur-md">
                
                {/* Account ID Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-red-500 text-right pr-1">معرف الحساب (Player ID)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-red-500">
                      <User size={18} />
                    </span>
                    <input 
                      type="text" 
                      value={loginId}
                      maxLength={10}
                      onChange={(e) => setLoginId(validateID(e.target.value))}
                      placeholder="معرف حساب يبدأ بـ 1..." 
                      className="w-full bg-black/60 border border-red-600/30 text-white rounded-xl py-3.5 pl-11 pr-4 text-left font-mono focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all duration-300 placeholder:text-gray-600"
                      required
                    />
                  </div>
                </div>

                {/* Activation Code Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-red-500 text-right pr-1">كود التفعيل (Activation Code)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-red-500">
                      <Lock size={18} />
                    </span>
                    <input 
                      type="password" 
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      placeholder="أدخل كود التفعيل..." 
                      className="w-full bg-black/60 border border-red-600/30 text-white rounded-xl py-3.5 pl-11 pr-4 text-left font-mono focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20 transition-all duration-300 placeholder:text-gray-600"
                      required
                    />
                  </div>
                </div>

                {/* Login Button */}
                <button 
                  type="submit"
                  className="w-full py-4 mt-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-black text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300 transform active:scale-95"
                >
                  تسجيل الدخول
                </button>
              </form>
            </motion.div>
          ) : (
            
            /* CONTROL PANEL SCREEN */
            <motion.div 
              key="panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center py-4"
            >
              
              {/* Logo & Branding for Control Panel */}
              <div className="flex flex-col items-center mb-6">
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  AL-MARO <span className="text-amber-500">CONTROL</span>
                </h2>
              </div>
              
              {/* Top User Status Dashboard bar */}
              <div className="w-full flex flex-wrap gap-2.5 justify-center items-center mb-6">
                
                {/* Player ID Box */}
                <div className="flex items-center gap-2 border border-red-600/40 bg-black/60 px-3 py-1.5 rounded-xl shadow-[0_0_10px_rgba(255,8,0,0.15)] backdrop-blur-md">
                  <User size={14} className="text-red-500" />
                  <span className="text-[10px] text-gray-400">ID:</span>
                  <span className="text-xs font-mono text-red-500 font-bold">{loginId}</span>
                </div>

                {/* Online Indicator */}
                <div className="flex items-center gap-2 border border-red-600/40 bg-black/60 px-3 py-1.5 rounded-xl shadow-[0_0_10px_rgba(255,8,0,0.15)] backdrop-blur-md">
                  <Users size={14} className="text-red-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400">نشط:</span>
                  <span className="text-xs font-mono text-red-500 font-bold">{onlineCount}</span>
                </div>

                {/* Guess Counter */}
                <div className="flex items-center gap-2 border border-green-500/40 bg-black/60 px-3 py-1.5 rounded-xl shadow-[0_0_10px_rgba(34,197,94,0.15)] backdrop-blur-md">
                  <Flame size={14} className="text-green-400" />
                  <span className="text-[10px] text-gray-400">تخمين:</span>
                  <span className="text-xs font-mono text-green-400 font-bold">{guessNumber}</span>
                </div>



                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="p-1.5 border border-red-600/40 bg-black/60 rounded-xl text-red-500 hover:bg-red-600/10 transition-all shadow-[0_0_10px_rgba(255,8,0,0.15)]"
                >
                  <LogOut size={16} />
                </button>
              </div>

               {/* GAME GRID & MULTIPLIERS LAYOUT */}
              <div className="w-full flex flex-col gap-1.5 bg-black/45 border border-red-600/30 p-3 sm:p-5 rounded-3xl shadow-[0_0_35px_rgba(255,8,0,0.15)] backdrop-blur-md mb-6">
                
                {TARGET_ROWS.map((rowInfo) => {
                  const isRowRevealed = revealedRows.includes(rowInfo.row);

                  return (
                    <div 
                      key={rowInfo.row} 
                      className={`flex items-center gap-2.5 sm:gap-4 p-1 rounded-xl transition-all duration-300 ${
                        isRowRevealed ? 'bg-red-600/5' : ''
                      }`}
                    >
                      {/* Grid cells (5 columns) */}
                      <div className="grid grid-cols-5 gap-1.5 flex-1">
                        {Array.from({ length: 5 }).map((_, cIdx) => {
                          const isSafe = isSafeApple(rowInfo.row, cIdx);
                          
                          return (
                            <div 
                              key={cIdx} 
                              className="aspect-square relative overflow-hidden rounded-full border flex items-center justify-center transition-all duration-500"
                              style={{
                                borderColor: isRowRevealed 
                                  ? (isSafe ? 'rgba(34, 197, 94, 0.65)' : 'rgba(239, 68, 68, 0.45)') 
                                  : 'rgba(255, 8, 0, 0.35)',
                                background: isRowRevealed
                                  ? (isSafe ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.05)')
                                  : 'rgba(0, 0, 0, 0.5)',
                                boxShadow: isRowRevealed && isSafe
                                  ? '0 0 15px rgba(34, 197, 94, 0.35)'
                                  : 'none'
                              }}
                            >
                              <AnimatePresence mode="wait">
                                {isRowRevealed ? (
                                  <motion.img
                                    key="revealed"
                                    initial={{ scale: 0, rotateY: 90 }}
                                    animate={{ scale: 1, rotateY: 0 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    src={isSafe ? GOOD_APPLE_IMG : BAD_APPLE_IMG}
                                    onError={(e) => {
                                      // Image loading fallback: display stylish symbols if offline
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                    className={`w-[82%] h-[82%] object-contain ${
                                      !isSafe ? 'opacity-30 grayscale filter' : ''
                                    }`}
                                    alt={isSafe ? "Safe Apple" : "Bad Apple"}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <motion.svg
                                    key="hidden"
                                    viewBox="0 0 64 64"
                                    initial={{ scale: 0.9, opacity: 0.2 }}
                                    animate={{ scale: 1, opacity: [0.25, 0.5, 0.25] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    className="w-[50%] h-[50%] text-red-500/60 drop-shadow-[0_0_8px_rgba(255,8,0,0.6)]"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    {/* Shackle */}
                                    <path d="M20 26V18C20 11.4 25.4 6 32 6C38.6 6 44 11.4 44 18V26" strokeWidth="4" />
                                    {/* Body */}
                                    <rect x="12" y="24" width="40" height="34" rx="8" ry="8" fill="rgba(0,0,0,0.6)" strokeWidth="4" />
                                    {/* Horn Left */}
                                    <path d="M15 24C11 18 10 14 13 11C15 9 17 11 19 17" strokeWidth="2" />
                                    {/* Horn Right */}
                                    <path d="M49 24C53 18 54 14 51 11C49 9 47 11 45 17" strokeWidth="2" />
                                    {/* Keyhole */}
                                    <circle cx="32" cy="38" r="3.5" fill="currentColor" />
                                    <path d="M32 41.5V47" strokeWidth="3" />
                                  </motion.svg>
                                )}
                              </AnimatePresence>

                              {/* Text backup if images fail to load */}
                              {isRowRevealed && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-mono text-[10px] font-black hidden">
                                  {isSafe ? (
                                    <span className="text-green-400">🍎</span>
                                  ) : (
                                    <span className="text-red-500">💣</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Row Label Multiplier (On Left/Right margin) */}
                      <span className="text-xs font-mono font-bold text-red-500 w-14 text-center bg-black/55 border border-red-500/30 py-1.5 px-2 rounded-lg shadow-sm">
                        {rowInfo.label}
                      </span>

                    </div>
                  );
                })}
              </div>

              {/* REFRESH/GUESS TRIGGER BUTTON */}
              <div className="w-full flex justify-center py-2 relative">
                <button
                  onClick={handleGuessPrediction}
                  disabled={isProcessing}
                  className={`relative flex items-center justify-center gap-3 px-12 py-4 bg-gradient-to-r from-red-600 to-red-800 text-black text-xl font-black rounded-2xl shadow-[0_0_30px_rgba(255,8,0,0.4)] transition-all duration-300 transform active:scale-95 ${
                    isProcessing ? 'opacity-65 cursor-not-allowed' : 'hover:from-red-500 hover:to-red-700 hover:shadow-[0_0_40px_rgba(255,8,0,0.6)]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin text-black" size={22} />
                      <span>جاري التخمين...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={22} className="animate-pulse" />
                      <span>كشف التوقعات (Refresh)</span>
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>



      {/* OVERLAY SPINNING WHILE REVEALING */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/75 z-40 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin shadow-[0_0_20px_rgba(239,68,68,0.2)]" />
          <span className="text-lg font-bold text-red-500 animate-pulse tracking-widest">جاري التخمين وتحميل التوقعات التنبؤية...</span>
        </div>
      )}

    </div>
  );
}
