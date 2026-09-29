import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
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
      const loggedInUser = await login(username.trim(), password);
      const uname = username.trim().toLowerCase();
      if (loggedInUser.role === "vendor" || uname.includes("vendor") || uname === "vendor" || uname === "bpl") {
        navigate("/vendor-portal");
      } else if (loggedInUser.role === "deo" || uname.startsWith("deo")) {
        navigate("/indents");
      } else if (loggedInUser.role === "consignee") {
        navigate("/deliveries");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify your User ID and Password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 antialiased selection:bg-[#86bc25] selection:text-black font-sans">
      {/* ── LEFT HERO PANE: Vibrant Enterprise Emerald/Teal Gradient ── */}
      <div className="relative flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-[#063a23] via-[#0d5939] to-[#0a4855] text-white shadow-2xl">
        {/* Colorful ambient orbs & pattern */}
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[#86bc25]/20 rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-cyan-400/20 rounded-full blur-3xl pointer-events-none translate-y-1/4 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:28px_28px] opacity-30 pointer-events-none" />

        {/* Top: Deloitte Brand */}
        <div className="relative z-10">
          <div className="flex items-center text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
            Deloitte<span className="text-[#86bc25] text-5xl leading-none font-black ml-0.5">.</span>
          </div>

          <div className="pt-10 sm:pt-14 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-100 tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-[#86bc25]" />
              Secure Enterprise Portal
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Equipment Procurement Portal
            </h1>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-lg font-normal leading-relaxed">
              Integrated medical equipment requisition, contract governance, and vendor fulfillment.
            </p>
          </div>
        </div>

        {/* Bottom: Powered by neoInt */}
        <div className="relative z-10 pt-8 mt-12 border-t border-white/15">
          <div className="text-[11px] font-bold text-emerald-200/80 tracking-widest uppercase mb-1">
            Powered by
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center">
            neo<span className="text-[#86bc25] font-black">Int</span>
          </div>
          <div className="text-xs text-emerald-100/70 mt-1 font-medium">
            Intelligence for healthcare procurement &amp; supply chain
          </div>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION PANE: Clean Enterprise White Card ── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-center p-8 sm:p-12 lg:p-14 bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-md mx-auto">
          {/* Form Card */}
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200/80 space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sign in to Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Enter your authorized credentials to access your dashboard.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-username" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  User ID / Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter User ID"
                    className="pl-10 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#186812] focus:ring-2 focus:ring-[#86bc25]/20 font-medium"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="pl-10 pr-10 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#186812] focus:ring-2 focus:ring-[#86bc25]/20 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                className="w-full h-11 bg-[#186812] hover:bg-[#1f7e17] text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-900/20 transition-all gap-2 cursor-pointer mt-3"
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
          </div>
        </div>
      </div>
    </div>
  );
}
