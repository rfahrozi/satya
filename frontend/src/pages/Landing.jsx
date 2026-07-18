import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  ShieldCheck, 
  Clock, 
  Layers, 
  ArrowRight, 
  ChevronRight,
  Menu,
  X,
  FileCheck,
  BellRing,
  Sparkles
} from 'lucide-react';

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  }
};

const fadeLeft = {
  hidden: { opacity: 0, x: 40 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-blue-400" />,
      title: "Sistem Dual Track Monitoring",
      description: "Satu platform untuk pelaporan Pengadilan Negeri (Eksternal) dan evaluasi mandiri Bagian/Unit di dalam Pengadilan Tinggi (Internal)."
    },
    {
      icon: <FileCheck className="w-6 h-6 text-emerald-400" />,
      title: "AMPUH, PMPZI & AKIP Ready",
      description: "Didukung Master Checklist Canonical berisi 295 Item yang dipetakan ke 15 Jabatan Resmi untuk memantau kelengkapan dokumen akreditasi dan zona integritas secara terpusat."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
      title: "Dashboard Eksekutif & Heatmap",
      description: "Visualisasi tren risiko bulanan, heatmap kepatuhan, serta pantauan real-time status dokumen per Pengadilan Negeri maupun per Unit Internal PT."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: "Keamanan, Reliabilitas & Audit",
      description: "Penyimpanan obyek S3 terisolasi, proteksi serangan OWASP (CORS, JWT Revocation, Rate Limiting), Opossum Circuit Breaker untuk toleransi kegagalan, dan Audit Trail."
    }
  ];

  const workflows = [
    {
      step: "01",
      title: "Pengaturan Master & Target",
      description: "Admin menetapkan daftar checklist wajib dan mengatur Periode (Bulanan/Semester/Tahunan). Sistem secara otomatis menghasilkan target pengumpulan."
    },
    {
      step: "02",
      title: "Pemenuhan & Unggah Evidence",
      description: "Satker (PN) dan 15 Jabatan Resmi PT mengunggah dokumen digital (PDF/Excel) ke dalam sistem terenkripsi melalui portal masing-masing."
    },
    {
      step: "03",
      title: "Verifikasi, Skoring & Revisi",
      description: "Verifikator dan Pimpinan memvalidasi bukti. Jika tidak sesuai, notifikasi revisi dikirim seketika beserta pembuatan Action Plan tindak lanjut."
    },
    {
      step: "04",
      title: "Management Review & Evaluasi",
      description: "Pimpinan PT memantau pencapaian KPI melalui Dashboard Eksekutif, mengesahkan penerimaan risiko, dan mem-build paket Management Review otomatis."
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Navbar */}
      <nav 
        className={`fixed w-full z-50 transition-all duration-500 border-b ${
          isScrolled 
            ? 'bg-[#050505]/80 backdrop-blur-xl border-white/10 py-4 shadow-2xl shadow-black/50' 
            : 'bg-transparent border-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Satya<span className="font-light text-slate-400">Monev</span></span>
          </motion.div>

          {/* Desktop Menu */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:flex items-center gap-8"
          >
            <a href="#beranda" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group">
              Beranda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-400 transition-all group-hover:w-full"></span>
            </a>
            <a href="#fitur" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group">
              Fitur
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-400 transition-all group-hover:w-full"></span>
            </a>
            <a href="#alur" className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group">
              Alur Kerja
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-400 transition-all group-hover:w-full"></span>
            </a>
            <Link to="/login">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all"
              >
                Masuk Sistem
              </motion.button>
            </Link>
          </motion.div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-slate-300 hover:text-white relative z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#050505]/95 backdrop-blur-2xl pt-28 px-6 flex flex-col gap-8 md:hidden"
          >
            <a href="#beranda" onClick={() => setMobileMenuOpen(false)} className="text-3xl font-bold text-white tracking-tight">Beranda</a>
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="text-3xl font-bold text-white tracking-tight">Fitur</a>
            <a href="#alur" onClick={() => setMobileMenuOpen(false)} className="text-3xl font-bold text-white tracking-tight">Alur Kerja</a>
            <Link 
              to="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="mt-8 px-6 py-4 rounded-xl bg-linear-to-r from-emerald-500 to-blue-600 text-white text-center font-bold text-lg"
            >
              Masuk Sistem
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="beranda" className="relative pt-40 pb-24 md:pt-56 md:pb-32">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/15 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none"></div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-6 relative z-10 text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-400 mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
            Sistem Aktif · v2.1.0 (Dual Track Monitoring)
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tighter text-white mb-8 leading-[1.1]">
            SATYA <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 via-teal-300 to-blue-500 text-2xl sm:text-3xl md:text-5xl block mt-4 font-bold">
              (Sistem Administrasi dan Tata kelola Yudisial yang Akuntabel)
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-3xl mx-auto text-lg md:text-2xl text-slate-400 mb-12 leading-relaxed font-light">
            Platform modern pengawasan Pengadilan Negeri secara real-time dan evaluasi mandiri Internal PT untuk memenuhi sertifikasi AMPUH, PMPZI, serta AKIP.
          </motion.p>
          
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                Mulai Sekarang <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <a href="#fitur" className="w-full sm:w-auto">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-8 py-4 rounded-full bg-white/5 text-white font-semibold border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md"
              >
                Pelajari Lebih Lanjut
              </motion.button>
            </a>
          </motion.div>
        </motion.div>

        {/* Mockup / Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto mt-24 px-6 relative"
        >
          <div className="rounded-3xl border border-white/10 bg-[#0f0f11]/80 p-2 md:p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-2xl">
            <div className="rounded-2xl overflow-hidden bg-[#161618] border border-white/5 aspect-video md:aspect-21/9 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]"></div>
              
              {/* Abstract Representation of Dashboard */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl flex flex-col gap-6 p-8">
                <div className="flex gap-6">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="w-1/3 h-28 bg-linear-to-br from-emerald-500/20 to-transparent border border-emerald-500/20 rounded-2xl backdrop-blur-sm"></motion.div>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, delay: 1, repeat: Infinity }} className="w-1/3 h-28 bg-linear-to-br from-blue-500/20 to-transparent border border-blue-500/20 rounded-2xl backdrop-blur-sm"></motion.div>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, delay: 2, repeat: Infinity }} className="w-1/3 h-28 bg-linear-to-br from-purple-500/20 to-transparent border border-purple-500/20 rounded-2xl backdrop-blur-sm"></motion.div>
                </div>
                <div className="w-full h-56 bg-linear-to-t from-white/5 to-transparent border border-white/10 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-32 relative border-t border-white/5 bg-[#0a0a0c]/50">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-7xl mx-auto px-6"
        >
          <div className="text-center mb-20">
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold tracking-wider uppercase text-sm">Keunggulan Utama</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Teknologi Modern</motion.h2>
            <motion.p variants={fadeUp} className="text-slate-400 max-w-2xl mx-auto text-xl font-light">
              Dibangun dengan performa maksimal, keamanan tinggi, dan pengalaman pengguna tingkat atas.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx} 
                variants={fadeUp}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                className="group p-8 rounded-3xl bg-linear-to-b from-white/3 to-transparent border border-white/10 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {React.cloneElement(feature.icon, { className: "w-24 h-24" })}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 relative z-10">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4 relative z-10">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed relative z-10">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Workflow Section */}
      <section id="alur" className="py-32 bg-[#050505] border-y border-white/5 relative overflow-hidden">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-7xl mx-auto px-6 relative z-10"
        >
          <div className="flex flex-col md:flex-row gap-20 items-center">
            <motion.div variants={fadeLeft} className="md:w-1/2">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm">Alur Singkat</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight leading-[1.1]">Efisien, <br/>Tepat Waktu & <br/>Akuntabel.</h2>
              <p className="text-slate-400 text-xl mb-10 leading-relaxed font-light">
                Kami merancang sistem <em>Dual Track</em> ini untuk memangkas birokrasi dan mempercepat proses evaluasi — baik untuk pelaporan eksternal maupun pemenuhan standar internal PT Kepri.
              </p>
              <Link to="/login">
                <motion.button
                  whileHover={{ x: 10 }}
                  className="inline-flex items-center gap-2 text-emerald-400 font-semibold text-lg"
                >
                  Coba Sistem Sekarang <ChevronRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>

            <div className="md:w-1/2 flex flex-col gap-6">
              {workflows.map((item, idx) => (
                <motion.div 
                  key={idx} 
                  variants={fadeUp}
                  whileHover={{ scale: 1.02 }}
                  className="flex gap-8 p-8 rounded-3xl bg-linear-to-r from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
                >
                  <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-linear-to-b from-white/20 to-white/5">{item.step}</div>
                  <div>
                    <h4 className="text-2xl font-semibold text-white mb-3">{item.title}</h4>
                    <p className="text-slate-400 text-lg leading-relaxed font-light">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="pt-16 pb-8 border-t border-white/10 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-emerald-500/10 blur-[100px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-12">
            
            {/* Logo & Info */}
            <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">Satya<span className="font-light text-slate-400">Monev</span></span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Jalan Sultan Muhammad Syah, Dompak,<br />
                Tanjungpinang, Kepulauan Riau
              </p>
            </div>

            {/* Hubungi Kami */}
            <div className="flex flex-col gap-4 items-center md:items-start text-center md:text-left">
              <h4 className="text-white font-semibold mb-2">Hubungi Kami</h4>
              <a href="https://www.pt-kepri.go.id" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-400 transition-colors text-sm">www.pt-kepri.go.id</a>
              <a href="mailto:ptkepulauanriau@gmail.com" className="text-slate-400 hover:text-emerald-400 transition-colors text-sm">ptkepulauanriau@gmail.com</a>
              <span className="text-slate-400 text-sm">WA: +628113976676</span>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-4 items-center md:items-start text-center md:text-left">
              <h4 className="text-white font-semibold mb-2">Tautan</h4>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors text-sm">Bantuan</a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors text-sm">Privasi</a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors text-sm">Ketentuan</a>
            </div>
            
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-500 text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} Pengadilan Tinggi. Hak Cipta Dilindungi.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

