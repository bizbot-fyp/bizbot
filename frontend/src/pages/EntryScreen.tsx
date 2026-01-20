import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import BotIcon from "@/components/ui/BotIcon";
import api from "@/lib/api";
import {jwtDecode} from "jwt-decode";
import { useGoogleLogin } from "@react-oauth/google";

const EntryScreen = () => {
  const [displayText, setDisplayText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const navigate = useNavigate();

  const phrases = [
    "Automate Your Business...",
    "AI-Powered Solutions",
    "Work Smarter, Not Harder",
    "Transform Your Workflow",
  ];

  useEffect(() => {
    let charIndex = 0;
    const currentPhrase = phrases[currentPhraseIndex];

    const typingInterval = setInterval(() => {
      if (charIndex <= currentPhrase.length) {
        setDisplayText(currentPhrase.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        }, 2000);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, [currentPhraseIndex]);

  // ----------------------
  // Google Login
  // ----------------------
  const handleLoginSuccess = (token: string) => {
    localStorage.setItem("access_token", token);
    const decoded: any = jwtDecode(token);
    if (decoded.roles?.includes("Administrator")) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await api.post("/auth/google", {
          id_token: tokenResponse.access_token,
        });
        handleLoginSuccess(res.data.access_token);
      } catch (err) {
        console.error(err);
        alert("Google login failed");
      }
    },
    onError: () => {
      alert("Google login failed");
    },
  });

  // ----------------------
  // OAuth placeholders for GitHub/LinkedIn
  // ----------------------
  const loginWithGitHub = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/auth/github`;
  };

  const loginWithLinkedIn = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/auth/linkedin`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Left Side - Hero Content */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <BotIcon size="lg" />
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              BizBot
            </h1>
          </div>

          <div className="h-16 mb-6">
            <p className="text-2xl lg:text-3xl font-semibold text-gradient-primary">
              {displayText}
              <span className="animate-typing-cursor text-primary">|</span>
            </p>
          </div>

          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            AI-powered business automation that transforms the way you work.
            Streamline operations, enhance customer engagement, and scale
            effortlessly.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">
                AI-Powered
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">
                Instant Setup
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-full">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent-foreground">
                Enterprise Secure
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Auth Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="card-elevated p-8 lg:p-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Welcome to BizBot
            </h2>
            <p className="text-muted-foreground mb-8">
              Get started with your business automation journey
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => navigate("/login")}
                className="w-full h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                Log In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                onClick={() => navigate("/signup")}
                variant="outline"
                className="w-full h-12 text-base font-semibold border-2"
              >
                Create Account
              </Button>
            </div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            {/* OAuth buttons */}
            <div className="flex justify-center gap-4">
              {/* Google */}
              <button
                onClick={() => loginWithGoogle()}
                className="w-12 h-12 rounded-lg border border-border bg-card hover:bg-accent flex items-center justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M21.35 11.1H12v2.8h5.35c-.23 1.2-.93 2.22-1.98 2.88v2.38h3.2c1.88-1.73 2.96-4.17 2.96-7.28 0-.7-.06-1.38-.18-2.02z"/>
                  <path fill="currentColor" d="M12 22c2.7 0 4.96-.88 6.62-2.4l-3.2-2.38c-.88.6-2.01.95-3.42.95-2.64 0-4.87-1.78-5.66-4.18H2.18v2.62C3.93 19.57 7.7 22 12 22z"/>
                  <path fill="currentColor" d="M5.34 13.09c-.19-.57-.3-1.18-.3-1.82 0-.64.11-1.25.3-1.82V7.07H2.18C1.45 8.54 1 10.2 1 12c0 1.8.45 3.46 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.5 0 2.84.52 3.9 1.52l3.15-3.15C17.48 2.1 14.98 1 12 1 7.7 1 3.93 3.48 2.18 7.07l3.66 2.84c.78-2.6 3.02-4.53 6.16-4.53z"/>
                </svg>
              </button>

              {/* GitHub */}
              <button
                onClick={() => loginWithGitHub()}
                className="w-12 h-12 rounded-lg border border-border bg-card hover:bg-accent flex items-center justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.73.08-.73 1.22.09 1.86 1.26 1.86 1.26 1.08 1.85 2.83 1.31 3.52 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.46-1.33-5.46-5.92 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.51.12-3.15 0 0 1-.32 3.3 1.23a11.53 11.53 0 016 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.64.24 2.85.12 3.15.77.84 1.24 1.91 1.24 3.22 0 4.6-2.8 5.61-5.48 5.91.43.37.81 1.1.81 2.22v3.3c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => loginWithLinkedIn()}
                className="w-12 h-12 rounded-lg border border-border bg-card hover:bg-accent flex items-center justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.3c-.97 0-1.75-.78-1.75-1.75S5.53 4.2 6.5 4.2 8.25 4.98 8.25 5.95 7.47 7.7 6.5 7.7zm13.5 11.3h-3v-5.5c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5v5.5h-3v-10h3v1.5c.87-1.18 2.3-1.87 3.75-1.87 2.76 0 5 2.24 5 5v5.37z"/>
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EntryScreen;
