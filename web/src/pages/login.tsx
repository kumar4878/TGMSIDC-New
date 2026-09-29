import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle, Lock, User, Shield, Eye, EyeOff, CheckCircle2,
  ArrowRight, Building2, Sparkles,
} from "lucide-react";

/* Demo accounts for evaluator quick-fill */
const DEMO_ACCOUNTS = [
  { username: "admin", label: "Admin" },
  { username: "ed_tgmsidc", label: "Executive Director" },
  { username: "gm_equip", label: "GM Equipment" },
  { username: "so_equip", label: "SO Equipment" },
  { username: "consignee_gandhi", label: "Consignee (Hospital)" },
  { username: "deo_user", label: "DEO User" },
  { username: "vendor_bpl", label: "Vendor (OEM)" },
];

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("ed_tgmsidc");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your User ID and Password.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      const uname = username.trim().toLowerCase();
      if (uname.startsWith("vendor")) {
        navigate("/vendor-portal");
      } else if (uname.startsWith("deo")) {
        navigate("/indents");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify your User ID and Password.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickFill(uname: string) {
    setUsername(uname);
    setPassword("password123");
    setError("");
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#030712] text-slate-100 antialiased selection:bg-[#86bc25] selection:text-black">
      {/* ── LEFT HERO PANE (TGMSIDC Enterprise Showcase) ── */}
      <div className="relative flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-gradient-to-br from-[#02050e] via-[#081329] to-[#030814] border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Subtle background ambient mesh glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#86bc25]/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

        {/* Top Header: Triple Brand Identity */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Government of Telangana */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#86bc25] animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
                  Government of Telangana
                </span>
              </div>
              <span className="text-slate-600 text-xs hidden sm:inline">|</span>
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
                Health, Medical &amp; Family Welfare
              </span>
            </div>


          </div>

          {/* Main Title Section */}
          <div className="pt-4 space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              <span className="inline-block bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-sm">
                TGMSIDC
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Equipment Lifecycle Cloud
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Statutory biomedical equipment procurement, Rate Contract governance, and transparent hospital supply
              orchestration across Telangana healthcare institutions.
            </p>

            {/* Strategic Partner Recognition Ribbon */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white tracking-wide">TGMSIDC</span>
                <span className="text-[10px] text-slate-400">Nodal Corporation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: Mission Stat Cards */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 sm:my-8">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Governed Outlay</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">₹1,248<span className="text-xs font-normal text-slate-400"> Cr</span></div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3 text-[#86bc25]" /> 100% Reconciled
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Districts Active</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">33 / 33</div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">State-wide Realtime Sync</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hospital Units</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">627+</div>
            <div className="text-[10px] text-cyan-400 mt-1 font-medium">Gandhi, Osmania, DH, CHC</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA Adherence</div>
            <div className="text-xl sm:text-2xl font-black text-[#86bc25] mt-1">99.4%</div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">Process Book §13 Audit</div>
          </div>
        </div>

        {/* Bottom: Statutory Certifications */}
        <div className="relative z-10 pt-4 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Institutional Trust &amp; Cyber Sovereignty Framework
          </div>
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[#86bc25]" />
              <span>Cert-In Empanelled Audit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>ISO/IEC 27001:2022 ISMS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>STQC Level-2 Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                256-bit TLS
              </span>
              <span>Encrypted Transit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANE (Direct User ID & Password) ── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-[#060b17] border-l border-slate-800">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Header Brand Lockup */}
          <div className="space-y-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white tracking-wider">TGMSIDC</span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Sign In to Portal
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enter your User ID and Password to access your operational dashboard.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Direct Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-username" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                User ID / Username
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter User ID"
                  className="pl-10 h-11 bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-[#86bc25] focus:ring-1 focus:ring-[#86bc25]"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </Label>
                <span className="text-[11px] text-slate-400">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="pl-10 pr-10 h-11 bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-[#86bc25] focus:ring-1 focus:ring-[#86bc25]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full h-11 bg-[#186812] hover:bg-[#1f7e17] text-white font-semibold text-sm tracking-wide shadow-lg shadow-emerald-950/40 transition-all gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick-Fill Chips for Demo Roles */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-medium text-slate-400 block">
              Quick-fill demo user ID:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleQuickFill(acc.username)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                    username === acc.username
                      ? "bg-[#186812]/40 border-[#86bc25] text-white font-medium shadow-xs"
                      : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Statutory Security Disclaimer */}
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[10.5px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Shield className="h-3.5 w-3.5 text-[#86bc25]" />
              Official Government of Telangana Portal
            </div>
            <p className="leading-relaxed text-[10px]">
              Unauthorized access or misuse is an offence punishable under Section 66 of the Information
              Technology Act, 2000. All sessions are cryptographically logged for statutory audit.
            </p>
          </div>
        </div>

        {/* Global Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center space-y-1">
          <p className="text-[11px] font-semibold text-slate-300">
            TGMSIDC Equipment Procurement &amp; Logistics Management System
          </p>
        </div>
      </div>
    </div>
  );
}
