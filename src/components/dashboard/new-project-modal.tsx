"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getIdToken } from "@/lib/auth/client";
import { uploadFile as uploadFileToR2 } from "@/lib/upload-service";

// ─── Types ────────────────────────────────────────────────────────────────────

type Orientation = "portrait" | "landscape";

// Step 1 = name + upload
// Step 2 = AI prompt
// Step 3 = orientation
// Step 4 = generating
type Step = 1 | 2 | 3 | 4;

interface UploadedAsset {
  preview: string;
  url: string;
  type: "video" | "image" | "audio";
  name: string;
  durationMs?: number;
  width?: number;
  height?: number;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Prompt templates ─────────────────────────────────────────────────────────

interface PromptTemplate {
  emoji: string;
  label: string;
  prompt: string;
  /** Only shown when these asset types are present */
  forTypes?: Array<"video" | "image" | "audio">;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    emoji: "🎯",
    label: "Highlight reel",
    prompt:
      "Extract only the most engaging and interesting moments. Remove boring parts and keep it punchy.",
    forTypes: ["video"],
  },
  {
    emoji: "✂️",
    label: "Remove silences",
    prompt:
      "Remove all silences, pauses, and filler words like um and uh. Tighten the pacing significantly.",
    forTypes: ["video", "audio"],
  },
  {
    emoji: "📱",
    label: "TikTok cut",
    prompt:
      "Edit this for TikTok. Keep only the most exciting 30–60 seconds, use bold captions, fast pacing.",
    forTypes: ["video"],
  },
  {
    emoji: "📺",
    label: "YouTube edit",
    prompt:
      "Create a polished YouTube edit. Keep a clear narrative, clean captions, professional pacing.",
    forTypes: ["video"],
  },
  {
    emoji: "🎙️",
    label: "Podcast clips",
    prompt:
      "This is a podcast or interview. Extract the top 3–5 most insightful moments as short clips.",
    forTypes: ["video", "audio"],
  },
  {
    emoji: "📝",
    label: "Auto captions",
    prompt:
      "Transcribe everything and add accurate captions throughout. Keep all footage.",
  },
  {
    emoji: "🎬",
    label: "Vlog cut",
    prompt:
      "This is a vlog. Cut it to the best moments, remove dead time, keep the energy high and under 5 minutes.",
    forTypes: ["video"],
  },
  {
    emoji: "⏱️",
    label: "Keep it short",
    prompt:
      "Keep only the very best 60 seconds. Ruthlessly cut anything that isn't essential.",
    forTypes: ["video"],
  },
  {
    emoji: "🎵",
    label: "Beat sync",
    prompt:
      "Sync video cuts to the music beat. Let the rhythm drive the editing.",
    forTypes: ["audio"],
  },
  {
    emoji: "🖼️",
    label: "Slideshow",
    prompt:
      "Create a smooth slideshow with nice transitions and even timing for each image.",
    forTypes: ["image"],
  },
];

// ─── Loading steps ─────────────────────────────────────────────────────────────

function buildLoadingSteps(hasPrompt: boolean): string[] {
  if (hasPrompt) {
    return [
      "Reading your editing instructions…",
      "Analysing content with AI…",
      "Detecting scenes and key moments…",
      "Building your custom timeline…",
      "Applying captions and pacing…",
      "Finalising your project…",
    ];
  }
  return [
    "Analysing your content with AI…",
    "Detecting scene cuts…",
    "Arranging clips on the timeline…",
    "Applying smart pacing…",
    "Finalising your project…",
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mimeToAssetType(mime: string): "video" | "image" | "audio" | null {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

function readMediaMeta(
  file: File,
  type: "video" | "image" | "audio",
): Promise<{ width?: number; height?: number; durationMs?: number }> {
  return new Promise((resolve) => {
    if (type === "image") {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      img.src = url;
    } else if (type === "video" || type === "audio") {
      const el = document.createElement(
        type === "video" ? "video" : "audio",
      ) as HTMLVideoElement;
      const url = URL.createObjectURL(file);
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          durationMs: Math.round(el.duration * 1000),
          width: (el as HTMLVideoElement).videoWidth || undefined,
          height: (el as HTMLVideoElement).videoHeight || undefined,
        });
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      el.src = url;
    } else {
      resolve({});
    }
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewProjectModal({
  isOpen,
  onClose,
}: NewProjectModalProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [projectName, setProjectName] = useState("");
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — prompt
  const [userPrompt, setUserPrompt] = useState("");

  // Step 3 — orientation
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  // Step 4 — generating
  const [loadingStep, setLoadingStep] = useState(0);

  // AI name suggestions
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset on close ────────────────────────────────────────────────────────
  const handleClose = () => {
    if (step === 4) return;
    setStep(1);
    setProjectName("");
    setAssets([]);
    setUserPrompt("");
    setOrientation("portrait");
    setLoadingStep(0);
    setNameSuggestions([]);
    onClose();
  };

  // ── AI name suggestions ───────────────────────────────────────────────────
  useEffect(() => {
    const doneNames = assets
      .filter((a) => a.status === "done" || a.status === "uploading")
      .map((a) => a.name);
    if (doneNames.length === 0) {
      setNameSuggestions([]);
      return;
    }

    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const token = await getIdToken();
        const res = await fetch("/api/projects/suggest-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ filenames: doneNames }),
        });
        if (res.ok) {
          const { suggestions } = await res.json();
          setNameSuggestions(suggestions ?? []);
        }
      } catch {
        // silently ignore — suggestions are optional
      } finally {
        setLoadingSuggestions(false);
      }
    }, 800);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [assets]);

  // ── File upload ───────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File) => {
    const assetType = mimeToAssetType(file.type);
    if (!assetType) {
      toast.error(`Unsupported file type: ${file.type}`);
      return;
    }

    const preview = URL.createObjectURL(file);
    const meta = await readMediaMeta(file, assetType);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const placeholder: UploadedAsset = {
      preview,
      url: "",
      type: assetType,
      name: file.name,
      status: "uploading",
      progress: 0,
      ...meta,
    };

    setAssets((prev) => [...prev, { ...placeholder, _id: id } as any]);

    try {
      // Use the presigned URL flow: browser → R2 directly, bypassing Vercel's
      // 4.5 MB serverless body limit. Files of any size work with this path.
      const result = await uploadFileToR2(file, (progress) => {
        setAssets((prev) =>
          prev.map((a) =>
            (a as any)._id === id
              ? { ...a, progress: progress.percentage }
              : a,
          ),
        );
      });

      setAssets((prev) =>
        prev.map((a) =>
          (a as any)._id === id
            ? { ...a, url: result.url, status: "done", progress: 100 }
            : a,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setAssets((prev) =>
        prev.map((a) =>
          (a as any)._id === id ? { ...a, status: "error", error: msg } : a,
        ),
      );
      toast.error(`Failed to upload ${file.name}: ${msg}`);
    }
  }, []);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach((f) => uploadFile(f));
    },
    [uploadFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeAsset = (idx: number) => {
    setAssets((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  // ── Prompt template helpers ───────────────────────────────────────────────
  const uploadedTypes = new Set(assets.map((a) => a.type));

  const visibleTemplates = PROMPT_TEMPLATES.filter(
    (t) =>
      !t.forTypes ||
      t.forTypes.some((type) => uploadedTypes.has(type)) ||
      uploadedTypes.size === 0,
  );

  const applyTemplate = (template: PromptTemplate) => {
    setUserPrompt(template.prompt);
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const canProceedToStep2 = projectName.trim().length > 0;

  const handleGenerate = async () => {
    setStep(4);
    setLoadingStep(0);

    const loadingSteps = buildLoadingSteps(userPrompt.trim().length > 0);
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, loadingSteps.length - 1));
    }, 3000);

    try {
      const token = await getIdToken();
      const doneAssets = assets
        .filter((a) => a.status === "done" && a.url)
        .map((a) => ({
          url: a.url,
          type: a.type,
          durationMs: a.durationMs,
          width: a.width,
          height: a.height,
          name: a.name,
        }));

      const res = await fetch("/api/projects/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: projectName.trim(),
          orientation,
          fps: 30,
          userPrompt: userPrompt.trim(),
          assets: doneAssets,
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const { projectId } = await res.json();
      router.push(`/editor/${projectId}`);
    } catch (err) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(`Failed to create project: ${msg}`);
      setStep(3); // back to orientation so user can retry
    }
  };

  if (!isOpen) return null;

  // ── Step label helpers ────────────────────────────────────────────────────
  const stepLabels: Record<Step, string> = {
    1: "New Project",
    2: "Tell the AI what you need",
    3: "Choose Orientation",
    4: "Building Your Timeline…",
  };

  // User-visible step number (step 4 is not a numbered user step)
  const visibleStepNum = step <= 3 ? step : null;

  const loadingSteps = buildLoadingSteps(userPrompt.trim().length > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-white text-lg font-semibold">
              {stepLabels[step]}
            </h2>
            {visibleStepNum !== null && (
              <p className="text-white/40 text-xs mt-0.5">
                Step {visibleStepNum} of 3
              </p>
            )}
          </div>
          {step !== 4 && (
            <button
              onClick={handleClose}
              className="text-white/40 hover:text-white transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {/* ── Step 1: Name + Upload ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-5">
            {/* Project name */}
            <div>
              <label className="block text-white/70 text-xs font-medium mb-1.5">
                Project name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My awesome vlog"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canProceedToStep2) setStep(2);
                }}
              />
              {/* AI name suggestions */}
              {(loadingSuggestions || nameSuggestions.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {loadingSuggestions && nameSuggestions.length === 0 && (
                    <span className="text-white/30 text-xs animate-pulse">
                      ✨ Suggesting names…
                    </span>
                  )}
                  {nameSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setProjectName(s)}
                      className="px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-white/60 text-xs hover:border-white/40 hover:text-white transition-colors"
                    >
                      ✨ {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drop zone */}
            <div>
              <label className="block text-white/70 text-xs font-medium mb-1.5">
                Upload assets{" "}
                <span className="text-white/30 font-normal">
                  (optional — add later in editor)
                </span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[120px] ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*,image/*,audio/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleFiles(e.target.files)
                  }
                />
                <span className="text-2xl">📁</span>
                <p className="text-white/50 text-sm text-center px-4">
                  Drop videos, photos, or audio here
                  <br />
                  <span className="text-white/30 text-xs">
                    or click to browse
                  </span>
                </p>
              </div>
            </div>

            {/* Asset list */}
            {assets.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {assets.map((asset, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                      {asset.type === "image" ? (
                        <img
                          src={asset.preview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">
                          {asset.type === "video" ? "🎬" : "🎵"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs truncate">
                        {asset.name}
                      </p>
                      {asset.status === "uploading" && (
                        <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${asset.progress}%` }}
                          />
                        </div>
                      )}
                      {asset.status === "done" && (
                        <p className="text-green-400 text-xs mt-0.5">
                          Uploaded ✓
                        </p>
                      )}
                      {asset.status === "error" && (
                        <p className="text-red-400 text-xs mt-0.5 truncate">
                          {asset.error}
                        </p>
                      )}
                    </div>

                    {asset.status !== "uploading" && (
                      <button
                        onClick={() => removeAsset(idx)}
                        className="text-white/30 hover:text-white/70 text-lg leading-none flex-shrink-0"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Next */}
            <div className="flex justify-end pt-1">
              <button
                disabled={!canProceedToStep2}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: AI Prompt ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            <p className="text-white/50 text-sm leading-relaxed">
              Describe what you want the AI to do with your footage. The more
              specific you are, the better the result.
            </p>

            {/* Textarea */}
            <div>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={
                  'e.g. "Extract only the funny moments from this vlog, remove all silences, keep it under 2 minutes for TikTok"'
                }
                rows={4}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-white/20 text-xs">
                  {userPrompt.length}/500 characters
                </span>
                {userPrompt.length > 0 && (
                  <button
                    onClick={() => setUserPrompt("")}
                    className="text-white/30 hover:text-white/60 text-xs transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Template chips */}
            <div>
              <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-2.5">
                Quick templates
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleTemplates.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => applyTemplate(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                      userPrompt === t.prompt
                        ? "bg-white/15 border-white/40 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/50 hover:border-white/25 hover:text-white/75"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* What the AI will do hint */}
            {userPrompt.trim().length > 0 && (
              <div className="flex gap-2.5 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3">
                <span className="text-base flex-shrink-0 mt-0.5">✨</span>
                <p className="text-white/45 text-xs leading-relaxed">
                  The AI will read this instruction before analysing your video.
                  It will adjust scene selection, captions, pacing, and duration
                  to match your goal.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg text-white/50 text-sm hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                {userPrompt.trim().length === 0 && (
                  <button
                    onClick={() => setStep(3)}
                    className="text-white/35 text-sm hover:text-white/60 transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  {userPrompt.trim().length > 0 ? "Use this prompt →" : "Continue →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Orientation ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="px-6 py-5 space-y-5">
            <p className="text-white/50 text-sm">
              Choose the format for your project. You can&apos;t change this later.
            </p>

            {/* Show active prompt reminder */}
            {userPrompt.trim().length > 0 && (
              <div className="flex items-start gap-2 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3">
                <span className="text-sm flex-shrink-0">✨</span>
                <p className="text-white/40 text-xs leading-relaxed line-clamp-2">
                  <span className="text-white/55 font-medium">Prompt: </span>
                  {userPrompt}
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="text-white/25 hover:text-white/50 text-xs ml-auto flex-shrink-0 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "portrait",
                    label: "Portrait",
                    sub: "9:16 · 1080×1920",
                    icon: (
                      <div className="w-8 h-12 rounded-md border-2 border-current" />
                    ),
                  },
                  {
                    value: "landscape",
                    label: "Landscape",
                    sub: "16:9 · 1920×1080",
                    icon: (
                      <div className="w-12 h-8 rounded-md border-2 border-current" />
                    ),
                  },
                ] as const
              ).map(({ value, label, sub, icon }) => (
                <button
                  key={value}
                  onClick={() => setOrientation(value)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                    orientation === value
                      ? "border-white bg-white/10 text-white"
                      : "border-white/15 bg-white/[0.02] text-white/40 hover:border-white/30 hover:text-white/60"
                  }`}
                >
                  {icon}
                  <div className="text-center">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{sub}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-lg text-white/50 text-sm hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleGenerate}
                className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                <span>✨</span>
                Create project
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Generating ────────────────────────────────────────── */}
        {step === 4 && (
          <div className="px-6 py-10 flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin" />
            </div>

            {/* Step text */}
            <div className="text-center space-y-1">
              <p className="text-white text-sm font-medium">
                {loadingSteps[loadingStep] ?? loadingSteps[loadingSteps.length - 1]}
              </p>
              <p className="text-white/40 text-xs">
                {userPrompt.trim().length > 0
                  ? "AI is following your editing instructions…"
                  : "This may take up to 30 seconds for longer videos"}
              </p>
            </div>

            {/* Active prompt reminder */}
            {userPrompt.trim().length > 0 && (
              <div className="max-w-xs text-center">
                <p className="text-white/20 text-xs leading-relaxed line-clamp-2">
                  &ldquo;{userPrompt}&rdquo;
                </p>
              </div>
            )}

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {loadingSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i <= loadingStep ? "bg-white" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
