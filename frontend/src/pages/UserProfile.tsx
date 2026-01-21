/**
 * File: UserProfile.tsx
 * Author: Areeba Abdullah
 *
 * Purpose: Renders the user account settings page, allowing users to
 *          manage profile info, change passwords, upload avatars, and
 *          update notification preferences.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Camera,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import BotIcon from "@/components/ui/BotIcon";
import api from "@/lib/api";

type TabType = "profile" | "security" | "notifications";

const UserProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [profileData, setProfileData] = useState({
    fullName: "",
    jobTitle: "",
    company: "",
    email: "",
    profilePicture: "",
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    workflowAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
  });

  // Fetch User Data on Load
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get("/api/users/me");
      const user = response.data;
      
      setProfileData({
        fullName: user.username || "",
        jobTitle: user.job_title || "",
        company: user.company || "",
        email: user.email || "",
        profilePicture: user.profile_picture_url || "",
      });

      if (user.notification_preferences) {
        setNotificationSettings(user.notification_preferences);
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
      toast({ title: "Error", description: "Could not load user data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/api/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfileData(prev => ({ ...prev, profilePicture: response.data.profile_picture_url }));
      toast({ title: "Avatar Updated", description: "Your profile picture has been updated." });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload image.", variant: "destructive" });
    }
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      await api.put("/api/users/me/profile", {
        full_name: profileData.fullName,
        job_title: profileData.jobTitle,
        company: profileData.company,
      });
      toast({ title: "Profile Saved", description: "Your changes have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySave = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      await api.put("/api/users/me/password", {
        current_password: securityData.currentPassword,
        new_password: securityData.newPassword,
      });
      
      setSecurityData({ ...securityData, currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password Updated", description: "Your password has been changed." });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.response?.data?.detail || "Failed to update password.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    setIsSaving(true);
    try {
      await api.put("/api/users/me/notifications", notificationSettings);
      toast({ title: "Preferences Saved", description: "Notification settings updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: "profile" as TabType, label: "Profile", icon: User },
    { id: "security" as TabType, label: "Security", icon: Shield },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <BotIcon size="sm" animated={false} />
              <div>
                <h1 className="text-lg font-bold text-foreground">Account Settings</h1>
                <p className="text-xs text-muted-foreground">Manage your profile and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <nav className="card-elevated p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1">
            {activeTab === "profile" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6 lg:p-8">
                <h2 className="text-xl font-semibold text-foreground mb-6">Profile Information</h2>

                <div className="flex items-center gap-6 mb-8">
                  <div className="relative group">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.profilePicture} />
                      <AvatarFallback className="text-2xl uppercase">
                        {profileData.fullName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={handleAvatarClick}
                      className="absolute inset-0 flex items-center justify-center bg-foreground/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Profile Photo</h3>
                    <p className="text-sm text-muted-foreground mb-2">Click on the avatar to upload a new photo</p>
                    <Button variant="outline" size="sm" onClick={handleAvatarClick}>Change Photo</Button>
                  </div>
                </div>

                <div className="grid gap-6 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={profileData.jobTitle}
                      onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                      placeholder="Enter your job title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={profileData.email} disabled className="bg-muted cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground">Contact support to change your email address</p>
                  </div>

                  <Button onClick={handleProfileSave} disabled={isSaving} className="w-fit bg-gradient-primary hover:opacity-90">
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="card-elevated p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Change Password</h2>
                  <div className="grid gap-6 max-w-lg">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleSecuritySave} disabled={isSaving} className="w-fit bg-gradient-primary hover:opacity-90">
                      {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : <><Shield className="w-4 h-4 mr-2" /> Update Password</>}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-6 lg:p-8">
                <h2 className="text-xl font-semibold text-foreground mb-6">Notification Preferences</h2>
                <div className="space-y-6">
                  {Object.keys(notificationSettings).map((key) => (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-border last:border-0">
                      <div>
                        <h3 className="font-medium text-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      </div>
                      <Switch
                        checked={notificationSettings[key as keyof typeof notificationSettings]}
                        onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, [key]: checked })}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={handleNotificationSave} disabled={isSaving} className="mt-6 bg-gradient-primary hover:opacity-90">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Preferences</>}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;