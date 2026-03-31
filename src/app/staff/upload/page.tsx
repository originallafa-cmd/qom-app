"use client";

import { useState, useRef } from "react";

interface AIResult {
  type: string;
  confidence: string;
  data: Record<string, unknown>;
  missing: string[];
  questions: string[];
  summary: string;
}

const TYPE_LABELS: Record<string, { icon: string; label: string; labelFil: string }> = {
  z_report: { icon: "📊", label: "Z Report / Sales", labelFil: "Z Report / Benta" },
  expense_receipt: { icon: "🧾", label: "Expense Receipt", labelFil: "Resibo ng Gastos" },
  delivery_invoice: { icon: "🚚", label: "Delivery Invoice", labelFil: "Invoice ng Delivery" },
  recipe: { icon: "📋", label: "Recipe / Menu Item", labelFil: "Recipe / Menu" },
  inventory_count: { icon: "📦", label: "Inventory Count", labelFil: "Bilang ng Imbentaryo" },
  unclear: { icon: "❓", label: "Unclear Photo", labelFil: "Hindi Malinaw" },
  unknown: { icon: "❓", label: "Unknown Document", labelFil: "Hindi Kilala" },
};

export default function StaffUpload() {
  const [lang, setLang] = useState<"en" | "fil">("en");
  const [step, setStep] = useState<"upload" | "processing" | "review" | "answer" | "saved" | "error">("upload");
  const [result, setResult] = useState<AIResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const t = lang === "en" ? {
    title: "Upload Document",
    subtitle: "Take a photo or choose a file — AI will read it automatically",
    takePhoto: "Take Photo",
    chooseFile: "Choose File",
    captionHint: "Add a note (optional)",
    captionPlaceholder: "e.g. Z report, vegetable receipt, delivery from supplier...",
    processing: "AI is reading your photo...",
    detected: "Detected",
    confidence: "Confidence",
    extracted: "Extracted Data",
    missing: "Couldn't read",
    save: "Save",
    retake: "Upload Again",
    cancel: "Cancel",
    saved: "Saved!",
    answer: "Your answer",
    send: "Send",
    askingYou: "AI needs more info:",
  } : {
    title: "Mag-upload ng Dokumento",
    subtitle: "Kumuha ng litrato o pumili ng file — babasahin ng AI",
    takePhoto: "Kumuha ng Litrato",
    chooseFile: "Pumili ng File",
    captionHint: "Magdagdag ng tala (opsyonal)",
    captionPlaceholder: "hal. Z report, resibo ng gulay, delivery mula sa supplier...",
    processing: "Binabasa ng AI ang litrato...",
    detected: "Nakita",
    confidence: "Kumpiyansa",
    extracted: "Na-extract na Data",
    missing: "Hindi mabasa",
    save: "I-save",
    retake: "Mag-upload Ulit",
    cancel: "Kanselahin",
    saved: "Na-save!",
    answer: "Sagot mo",
    send: "Ipadala",
    askingYou: "Kailangan ng AI ng info:",
  };

  async function handleUpload(file: File, context?: string) {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("processing");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (context) formData.append("context", context);

      const res = await fetch("/api/ai/process-image", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        setStep("error");
        setMessage(data.error);
        return;
      }

      setResult(data);

      // If data was extracted (has any fields), go to review even if there are questions
      const hasData = data.data && Object.keys(data.data).length > 0;

      if (data.type === "unclear" && !hasData) {
        // Truly unreadable — ask to retake
        setStep("answer");
      } else if (!hasData && data.questions?.length > 0) {
        // No data at all + has questions — need to ask
        setStep("answer");
      } else {
        // Got data — show review (questions shown as notes, not blocking)
        setStep("review");
      }
    } catch {
      setStep("error");
      setMessage("Connection error");
    }
  }

  async function handleAnswer() {
    if (!answer.trim() || !selectedFile) return;
    // Re-process with the answer as context
    await handleUpload(selectedFile, answer);
    setAnswer("");
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);

    try {
      const res = await fetch("/api/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: result.type, data: result.data }),
      });
      const data = await res.json();

      if (data.success) {
        setStep("saved");
        setMessage(data.message);
      } else {
        setStep("error");
        setMessage(data.error || "Save failed");
      }
    } catch {
      setStep("error");
      setMessage("Connection error");
    }
    setSaving(false);
  }

  function reset() {
    setStep("upload");
    setResult(null);
    setAnswer("");
    setMessage("");
    setPreviewUrl(null);
    setSelectedFile(null);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, caption || undefined);
  }

  async function openCamera() {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1080 }, height: { ideal: 1920 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setShowCamera(false);
      // Fallback to file input if camera access denied
      fileRef.current?.click();
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        closeCamera();
        handleUpload(file, caption || undefined);
      }
    }, "image/jpeg", 0.9);
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  const typeInfo = TYPE_LABELS[result?.type || "unknown"] || TYPE_LABELS.unknown;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-staff-text font-[family-name:var(--font-cairo)]">
          {t.title}
        </h2>
        <button onClick={() => setLang(lang === "en" ? "fil" : "en")}
          className="text-xs px-2 py-1 rounded bg-staff-bg border border-staff-border text-staff-text2">
          {lang === "en" ? "FIL" : "EN"}
        </button>
      </div>

      {/* UPLOAD STEP */}
      {step === "upload" && (
        <div className="bg-staff-card rounded-2xl border border-staff-border p-6 text-center">
          <div className="w-20 h-20 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📸</span>
          </div>
          <p className="text-sm text-staff-text2 mb-4">{t.subtitle}</p>

          {/* Caption / description */}
          <div className="mb-4 text-left">
            <label className="block text-xs text-staff-text2 mb-1">{t.captionHint}</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t.captionPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-staff-border bg-staff-bg text-staff-text text-sm"
            />
          </div>

          <div className="space-y-3">
            {/* Camera button */}
            <button onClick={openCamera}
              className="block w-full py-4 rounded-xl bg-teal text-white font-semibold text-lg hover:bg-teal-dark transition-colors">
              {t.takePhoto}
            </button>

            {/* File picker */}
            <label className="block w-full py-4 rounded-xl bg-staff-bg border-2 border-dashed border-staff-border text-staff-text font-medium cursor-pointer hover:border-teal transition-colors text-center">
              {t.chooseFile}
              <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" ref={fileRef} />
            </label>
          </div>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* CAMERA VIEWFINDER */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
            <button onClick={closeCamera}
              className="w-14 h-14 rounded-full bg-white/20 text-white text-xl flex items-center justify-center">
              ✕
            </button>
            <button onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/30 flex items-center justify-center active:scale-90 transition-transform">
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>
            <div className="w-14 h-14" /> {/* spacer */}
          </div>
        </div>
      )}

      {/* PROCESSING STEP */}
      {step === "processing" && (
        <div className="bg-staff-card rounded-2xl border border-staff-border p-6 text-center">
          {previewUrl && (
            <img src={previewUrl} alt="Upload" className="w-full max-h-48 object-contain rounded-xl mb-4" />
          )}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-staff-text">{t.processing}</span>
          </div>
        </div>
      )}

      {/* ANSWER STEP (AI needs more info) */}
      {step === "answer" && result && (
        <div className="bg-staff-card rounded-2xl border border-staff-border p-5">
          {previewUrl && (
            <img src={previewUrl} alt="Upload" className="w-full max-h-36 object-contain rounded-xl mb-4" />
          )}

          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 mb-4">
            <p className="text-sm font-semibold text-staff-text mb-2">{t.askingYou}</p>
            {result.questions.map((q, i) => (
              <p key={i} className="text-sm text-staff-text2">• {q}</p>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
              placeholder={t.answer}
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl border border-staff-border bg-staff-bg text-staff-text"
            />
            <button onClick={handleAnswer} disabled={!answer.trim()}
              className="px-4 py-3 rounded-xl bg-teal text-white font-semibold disabled:opacity-40">
              {t.send}
            </button>
          </div>

          <button onClick={reset} className="w-full mt-3 text-sm text-staff-text2 hover:text-staff-text">
            {t.retake}
          </button>
        </div>
      )}

      {/* REVIEW STEP (data extracted, confirm) */}
      {step === "review" && result && (
        <div className="bg-staff-card rounded-2xl border border-staff-border p-5">
          {previewUrl && (
            <img src={previewUrl} alt="Upload" className="w-full max-h-36 object-contain rounded-xl mb-4" />
          )}

          {/* Type badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div>
              <p className="text-sm font-semibold text-staff-text">
                {t.detected}: {lang === "en" ? typeInfo.label : typeInfo.labelFil}
              </p>
              <p className="text-xs text-staff-text2">
                {t.confidence}: <span className={result.confidence === "high" ? "text-success" : result.confidence === "medium" ? "text-warning" : "text-danger"}>
                  {result.confidence}
                </span>
              </p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm text-teal font-medium mb-3">{result.summary}</p>

          {/* Extracted data */}
          <div className="bg-staff-bg rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-staff-text2 mb-2">{t.extracted}:</p>
            {Object.entries(result.data).map(([key, value]) => {
              if (Array.isArray(value)) {
                return (
                  <div key={key} className="mb-2">
                    <p className="text-xs text-staff-text2 capitalize">{key.replace(/_/g, " ")}:</p>
                    {value.map((item, i) => (
                      <p key={i} className="text-sm text-staff-text ml-2">
                        • {typeof item === "object" ? Object.values(item as Record<string, unknown>).join(" — ") : String(item)}
                      </p>
                    ))}
                  </div>
                );
              }
              return (
                <div key={key} className="flex justify-between text-sm py-0.5">
                  <span className="text-staff-text2 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-staff-text font-medium">
                    {typeof value === "number" ? value.toLocaleString("en-AE", { minimumFractionDigits: 2 }) : String(value)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Missing fields */}
          {result.missing.length > 0 && (
            <div className="bg-warning/10 rounded-xl p-2 mb-3 text-xs text-warning">
              {t.missing}: {result.missing.join(", ")}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-teal text-white font-semibold text-lg disabled:opacity-40">
              {saving ? "..." : `${t.save} ✓`}
            </button>
            <button onClick={reset}
              className="px-4 py-3 rounded-xl bg-staff-bg border border-staff-border text-staff-text2">
              {t.retake}
            </button>
          </div>
        </div>
      )}

      {/* SAVED STEP */}
      {step === "saved" && (
        <div className="bg-success/5 border border-success/20 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-lg font-bold text-success">{t.saved}</h3>
          <p className="text-sm text-staff-text2 mt-1">{message}</p>
          <button onClick={reset}
            className="mt-4 px-6 py-3 rounded-xl bg-teal text-white font-semibold">
            {t.retake}
          </button>
        </div>
      )}

      {/* ERROR STEP */}
      {step === "error" && (
        <div className="bg-danger/5 border border-danger/20 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">❌</span>
          </div>
          <p className="text-sm text-danger">{message}</p>
          <button onClick={reset}
            className="mt-4 px-6 py-3 rounded-xl bg-teal text-white font-semibold">
            {t.retake}
          </button>
        </div>
      )}
    </div>
  );
}
