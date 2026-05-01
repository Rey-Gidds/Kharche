"use client";

import { useSession } from "@/lib/auth-client";
import { useState, useRef } from "react";
import { useNotification } from "@/context/NotificationContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, User as UserIcon, Camera, Loader2, Edit2, Check, X } from "lucide-react";
import Link from "next/link";

import FullScreenLoader from "@/app/components/FullScreenLoader";

export default function AccountPage() {
    const { data: session, isPending, error: sessionError } = useSession();
    const { showNotification } = useNotification();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [uploading, setUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState("");
    const [savingName, setSavingName] = useState(false);

    const [isNavigatingHome, setIsNavigatingHome] = useState(false);

    if (isPending || isNavigatingHome) {
        return <FullScreenLoader />;
    }

    if (sessionError || !session) {
        router.push("/sign-in");
        return null;
    }

    const { user } = session;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            showNotification("Image must be less than 1MB", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadstart = () => setUploading(true);
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const res = await fetch("/api/user/profile-picture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: base64 }),
                });

                if (res.ok) {
                    showNotification("Profile picture updated!", "success");
                    window.location.reload();
                } else {
                    const data = await res.json();
                    showNotification(data.error || "Upload failed", "error");
                }
            } catch (err) {
                showNotification("An error occurred during upload", "error");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleNameSave = async () => {
        if (!newName || newName.trim() === user.name) {
            setIsEditingName(false);
            return;
        }

        setSavingName(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() }),
            });

            if (res.ok) {
                showNotification("Profile updated successfully!", "success");
                window.location.reload();
            } else {
                const data = await res.json();
                showNotification(data.error || "Failed to update profile", "error");
            }
        } catch (err) {
            showNotification("An error occurred while updating profile", "error");
        } finally {
            setSavingName(false);
        }
    };

    return (
        <div className="min-h-screen md:min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] pb-10 md:pb-20 animate-in fade-in duration-700">
            <header className="px-6 pt-6 md:pt-12 pb-6 md:pb-8 max-w-4xl mx-auto">
                <Link 
                    href="/" 
                    onClick={() => setIsNavigatingHome(true)}
                    className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6 group text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Home
                </Link>
                <h1 className="text-4xl font-serif font-bold text-[var(--foreground)] animate-in slide-in-from-left duration-500">My Account</h1>
                <p className="text-[var(--muted)] mt-2 animate-in slide-in-from-left duration-500 delay-100">Manage your profile and personal details.</p>
            </header>

            <main className="px-6 max-w-4xl mx-auto">
                <section className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] border-2 border-[var(--border)] overflow-hidden shadow-inner">
                                {user.image ? (
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-10 h-10" />
                                )}
                                
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                type="button"
                                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            {isEditingName ? (
                                <div className="flex items-center gap-2 mb-1">
                                    <input 
                                        type="text" 
                                        value={newName} 
                                        onChange={(e) => setNewName(e.target.value)} 
                                        autoFocus
                                        className="bg-transparent border-b border-[var(--accent)] outline-none font-bold text-xl w-full max-w-[200px]"
                                        disabled={savingName}
                                    />
                                    <button onClick={handleNameSave} disabled={savingName} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                                        {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setIsEditingName(false)} disabled={savingName} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold truncate">{user.name}</h2>
                                    <button onClick={() => { setNewName(user.name); setIsEditingName(true); }} className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] rounded opacity-50 hover:opacity-100 transition-opacity">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            <p className="text-[var(--muted)] text-sm truncate">{user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                            <span className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Account ID</span>
                            <code className="text-xs break-all">{user.id}</code>
                        </div>
                        <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                            <span className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Member Since</span>
                            <span className="text-sm">{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </section>
                
                {/* Optional: Add a link to the wallet page for convenience */}
                <div className="mt-8">
                    <Link href="/me/wallet" className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)] transition-all group shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">View Wallet</h3>
                                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Manage your balance and currency</p>
                            </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--muted)] group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
