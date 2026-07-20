"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export interface ApplyVacancy {
  id: number;
  title: string;
  slug: string;
  reference: string;
  privacyVersion: string;
  retentionDays: number;
  closesAt: string | null;
  questions: { id: string; label: string; type: "text" | "textarea" | "yes_no" | "link"; required: boolean; eligibility?: boolean }[];
  requiredDocs: { cv: boolean; supporting: boolean; video: boolean; audio: boolean };
}

interface ExistingApp {
  id: number;
  ref: string;
  status: string;
  form: Record<string, unknown>;
}

interface UploadedFile {
  id: number;
  kind: string;
  filename: string;
}

const STEPS = ["Verify email", "About you", "Work details", "Role questions", "Documents", "Review & submit"];

const DOC_META: Record<string, { label: string; hint: string; accept: string }> = {
  cv: { label: "CV / Résumé", hint: "PDF or DOCX, up to 5 MB", accept: ".pdf,.docx" },
  supporting: { label: "Supporting document", hint: "PDF or DOCX, up to 10 MB", accept: ".pdf,.docx" },
  video: { label: "Video submission", hint: "MP4 or MOV, up to 200 MB — natural quality, no need to over-produce", accept: ".mp4,.mov" },
  audio: { label: "Audio submission", hint: "MP3 or WAV, up to 30 MB", accept: ".mp3,.wav" },
};

export function ApplyForm({
  vacancy,
  signedInEmail,
  existing,
  existingFiles,
}: {
  vacancy: ApplyVacancy;
  signedInEmail: string | null;
  existing: ExistingApp | null;
  existingFiles: UploadedFile[];
}) {
  const alreadySubmitted = existing !== null && existing.status !== "draft";

  const [step, setStep] = useState(signedInEmail ? 1 : 0);
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(Boolean(signedInEmail));
  const [applicationId, setApplicationId] = useState<number | null>(existing?.id ?? null);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    if (existing?.form) {
      for (const [k, v] of Object.entries(existing.form)) base[k] = String(v ?? "");
    }
    return base;
  });
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState<Record<string, number>>({}); // kind → percent
  const [privacyAck, setPrivacyAck] = useState(false);
  const [talentPool, setTalentPool] = useState(false); // deliberately unticked by default
  const [accuracy, setAccuracy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [receipt, setReceipt] = useState<string | null>(null);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  /* ── autosave (debounced) ─────────────────────────────────── */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const saveDraft = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/careers/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId: vacancy.id, form: formRef.current }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplicationId(data.applicationId);
        setSaveState("saved");
      } else {
        setSaveState("idle");
      }
      return res.ok ? Number(data.applicationId) : null;
    } catch {
      setSaveState("idle");
      return null;
    }
  }, [vacancy.id]);

  useEffect(() => {
    if (!verified || alreadySubmitted || receipt) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveDraft, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [form, verified, alreadySubmitted, receipt, saveDraft]);

  /* ── OTP ──────────────────────────────────────────────────── */
  async function startOtp() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", email }),
    });
    setBusy(false);
    if (res.ok) setOtpSent(true);
    else setError((await res.json()).error ?? "Could not send the code — check the address");
  }

  async function verifyOtp() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", email, code: otpCode.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setVerified(true);
      setStep(1);
      // if this email already has a draft/submission, reload to pick it up
      const draft = await fetch("/api/careers/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId: vacancy.id, form: formRef.current }),
      });
      if (draft.status === 409) window.location.reload();
      else if (draft.ok) setApplicationId((await draft.json()).applicationId);
    } else {
      setError((await res.json()).error ?? "That code didn't work");
    }
  }

  /* ── uploads ──────────────────────────────────────────────── */

  function clearProgress(kind: string) {
    setUploading((u) => {
      const next = { ...u };
      delete next[kind];
      return next;
    });
  }

  /** XHR with upload progress; resolves {status, body} or rejects on network error. */
  function xhrSend(opts: {
    method: string;
    url: string;
    body: File | FormData;
    contentType?: string;
    kind: string;
  }): Promise<{ status: number; text: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(opts.method, opts.url);
      if (opts.contentType) xhr.setRequestHeader("Content-Type", opts.contentType);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setUploading((u) => ({ ...u, [opts.kind]: Math.round((e.loaded / e.total) * 100) }));
      };
      xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
      xhr.onerror = () => reject(new Error("network"));
      xhr.send(opts.body);
    });
  }

  async function upload(kind: string, file: File) {
    setError("");
    let appId = applicationId;
    if (!appId) appId = await saveDraft();
    if (!appId) {
      setError("Could not create your draft — please try again");
      return;
    }
    setUploading((u) => ({ ...u, [kind]: 0 }));
    try {
      // ask the server how to upload (and validate before any bytes move)
      const signRes = await fetch("/api/careers/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          applicationId: appId,
          kind,
          filename: file.name,
          mime: file.type,
          size: file.size,
        }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) {
        setError(sign.error ?? "Upload failed — please try again");
        return;
      }

      if (sign.mode === "direct") {
        // large files go straight to private storage, not through our server
        const put = await xhrSend({ method: "PUT", url: sign.uploadUrl, body: file, contentType: file.type, kind });
        if (put.status < 200 || put.status >= 300) {
          setError("The file didn't reach storage — please try again");
          return;
        }
        const confirmRes = await fetch("/api/careers/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            applicationId: appId,
            kind,
            storagePath: sign.storagePath,
            filename: file.name,
            mime: file.type,
            size: file.size,
          }),
        });
        const confirmed = await confirmRes.json();
        if (!confirmRes.ok) {
          setError(confirmed.error ?? "Upload failed — please try again");
          return;
        }
        setFiles((f) => [
          ...f.filter((x) => x.kind !== kind),
          { id: confirmed.fileId, kind, filename: confirmed.filename },
        ]);
        return;
      }

      // local-dev fallback: classic multipart through the server
      const data = new FormData();
      data.append("applicationId", String(appId));
      data.append("kind", kind);
      data.append("file", file);
      const res = await xhrSend({ method: "POST", url: "/api/careers/upload", body: data, kind });
      const body = JSON.parse(res.text);
      if (res.status === 200) {
        setFiles((f) => [...f.filter((x) => x.kind !== kind), { id: body.fileId, kind, filename: body.filename }]);
      } else {
        setError(body.error ?? "Upload failed");
      }
    } catch {
      setError("Upload failed — check your connection and try again");
    } finally {
      clearProgress(kind);
    }
  }

  /* ── validation per step ──────────────────────────────────── */
  function stepError(): string | null {
    if (step === 1) {
      if (!form.firstName?.trim()) return "Please enter your first name";
      if (!form.lastName?.trim()) return "Please enter your last name";
      if (!form.phone?.trim() || form.phone.trim().length < 7) return "Please enter a valid phone number";
      if (!form.location?.trim()) return "Please tell us where you're based";
    }
    if (step === 2) {
      if (!form.availability?.trim()) return "Please tell us your availability";
      if (!form.rightToWork) return "Please confirm your right to work";
      if (!form.locationWilling) return "Please answer the location question";
      if (!form.conflictOfInterest) return "Please answer the conflict of interest question";
      if (form.conflictOfInterest === "yes" && !form.conflictDetails?.trim())
        return "Please describe the conflict of interest";
      if (!form.brandConflict) return "Please answer the brand commitments question";
      if (form.brandConflict === "yes" && !form.brandConflictDetails?.trim())
        return "Please describe your existing brand commitments";
    }
    if (step === 3) {
      for (const q of vacancy.questions) {
        if (q.required && !form[q.id]?.trim()) return `Please answer: ${q.label}`;
      }
    }
    if (step === 4) {
      for (const [kind, required] of Object.entries(vacancy.requiredDocs)) {
        if (required && !files.some((f) => f.kind === kind))
          return `Please upload ${DOC_META[kind]?.label.toLowerCase() ?? kind}`;
      }
    }
    return null;
  }

  function next() {
    const err = stepError();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── submit ───────────────────────────────────────────────── */
  async function submit() {
    if (!privacyAck) {
      setError("Please confirm you've read the privacy notice");
      return;
    }
    if (!accuracy) {
      setError("Please confirm the accuracy declaration");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/careers/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vacancyId: vacancy.id,
        form,
        privacyAcknowledged: true,
        accuracyDeclared: true,
        talentPoolConsent: talentPool,
        firstName: form.firstName?.trim(),
        lastName: form.lastName?.trim(),
        phone: form.phone?.trim(),
      }),
    });
    setBusy(false);
    const data = await res.json();
    if (res.ok) {
      setReceipt(data.ref);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError(data.error ?? "Submission failed — please try again");
    }
  }

  /* ── already submitted / receipt states ───────────────────── */
  if (alreadySubmitted && !receipt) {
    return (
      <div className="glass mt-8 p-8 text-center">
        <h2 className="display text-2xl text-cream">You&apos;ve already applied</h2>
        <p className="mt-3 text-sm text-muted">
          Your application <span className="text-cream">{existing?.ref}</span> for this role was
          submitted. You can track it, withdraw, or send a correction from your dashboard.
        </p>
        <Link href="/careers/dashboard" className="btn btn-primary btn-md mt-6">
          Go to my dashboard
        </Link>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="glass mt-8 p-8 text-center">
        <p className="eyebrow eyebrow-emerald mb-3">Application received</p>
        <h2 className="display text-3xl text-cream">Thank you</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Your reference is{" "}
          <span className="font-semibold tracking-wider text-emerald-glow">{receipt}</span>. A
          confirmation email is on its way to {email}. We read every application after the closing
          date and will keep you posted at each stage.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/careers/dashboard" className="btn btn-primary btn-md">
            Track my application
          </Link>
          <Link href="/careers" className="btn btn-ghost btn-md">
            Back to careers
          </Link>
        </div>
      </div>
    );
  }

  /* ── form UI ──────────────────────────────────────────────── */
  return (
    <div className="mt-8">
      {/* progress */}
      <div className="mb-8">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted">
          <span>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </span>
          {verified && (
            <span className={saveState === "saved" ? "text-emerald-glow" : ""}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Draft saved" : ""}
            </span>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-glow transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="glass p-7">
        {/* STEP 0 — verify email */}
        {step === 0 && (
          <div>
            <h2 className="display text-2xl text-cream">First, verify your email</h2>
            <p className="mt-2 text-sm text-muted">
              We&apos;ll send a 6-digit code so your application saves as you go — you can leave and
              come back any time before the closing date.
            </p>
            {!otpSent ? (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  className="field flex-1"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <button className="btn btn-primary btn-md" onClick={startOtp} disabled={busy || !email.includes("@")}>
                  {busy ? "Sending…" : "Send code"}
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-xs text-muted">
                  Code sent to <span className="text-cream">{email}</span> — valid for 10 minutes.{" "}
                  <button className="text-emerald-glow hover:underline" onClick={() => setOtpSent(false)}>
                    Change address
                  </button>
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="field flex-1 tracking-[0.5em]"
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button className="btn btn-primary btn-md" onClick={verifyOtp} disabled={busy || otpCode.length !== 6}>
                    {busy ? "Checking…" : "Verify"}
                  </button>
                </div>
                <button className="mt-3 text-xs text-muted hover:text-cream" onClick={startOtp} disabled={busy}>
                  Resend code
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 1 — about you */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="display text-2xl text-cream">About you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="eyebrow mb-1.5 block">First name *</label>
                <input className="field w-full" value={form.firstName ?? ""} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Last name *</label>
                <input className="field w-full" value={form.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="eyebrow mb-1.5 block">Phone (WhatsApp preferred) *</label>
                <input className="field w-full" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+234…" />
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Where are you based? *</label>
                <input className="field w-full" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Lekki, Lagos" />
              </div>
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Preferred way to reach you</label>
              <select className="field w-full" value={form.contactPreference ?? "whatsapp"} onChange={(e) => set("contactPreference", e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="phone">Phone call</option>
              </select>
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Portfolio / social links (optional)</label>
              <input className="field w-full" value={form.portfolio ?? ""} onChange={(e) => set("portfolio", e.target.value)} placeholder="Instagram, TikTok, YouTube, website…" />
              <p className="mt-1.5 text-[11px] text-muted">Anything that shows your work. Separate multiple links with commas.</p>
            </div>
          </div>
        )}

        {/* STEP 2 — work details */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="display text-2xl text-cream">Work details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="eyebrow mb-1.5 block">Current employment status</label>
                <select className="field w-full" value={form.employmentStatus ?? ""} onChange={(e) => set("employmentStatus", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-employed / freelance</option>
                  <option value="student">Student</option>
                  <option value="between_roles">Between roles</option>
                </select>
              </div>
              <div>
                <label className="eyebrow mb-1.5 block">Notice period</label>
                <select className="field w-full" value={form.noticePeriod ?? ""} onChange={(e) => set("noticePeriod", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="immediate">Available immediately</option>
                  <option value="1_week">1 week</option>
                  <option value="2_weeks">2 weeks</option>
                  <option value="1_month">1 month</option>
                  <option value="longer">Longer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Your availability *</label>
              <input className="field w-full" value={form.availability ?? ""} onChange={(e) => set("availability", e.target.value)} placeholder="e.g. Available from September, evenings and weekends fine" />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Expected compensation (optional)</label>
              <input className="field w-full" value={form.expectedCompensation ?? ""} onChange={(e) => set("expectedCompensation", e.target.value)} placeholder="A range is fine — this never disqualifies you" />
            </div>
            <YesNo label="Do you have the legal right to work in Nigeria? *" value={form.rightToWork} onChange={(v) => set("rightToWork", v)} />
            <YesNo label="Are you able to work from our Lekki, Lagos base as the role requires? *" value={form.locationWilling} onChange={(v) => set("locationWilling", v)} />
            <YesNo label="Do you have any conflict of interest with H06 (e.g. work for a competitor, family ties to the business)? *" value={form.conflictOfInterest} onChange={(v) => set("conflictOfInterest", v)} />
            {form.conflictOfInterest === "yes" && (
              <textarea className="field w-full" rows={3} placeholder="Tell us about it — honesty here is never held against you" value={form.conflictDetails ?? ""} onChange={(e) => set("conflictDetails", e.target.value)} />
            )}
            <YesNo label="Do you have existing brand partnerships or ambassador commitments? *" value={form.brandConflict} onChange={(v) => set("brandConflict", v)} />
            {form.brandConflict === "yes" && (
              <textarea className="field w-full" rows={3} placeholder="Which brands, and what do those commitments involve?" value={form.brandConflictDetails ?? ""} onChange={(e) => set("brandConflictDetails", e.target.value)} />
            )}
          </div>
        )}

        {/* STEP 3 — role questions */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="display text-2xl text-cream">Role questions</h2>
            {vacancy.questions.length === 0 && <p className="text-sm text-muted">No extra questions for this role — carry on.</p>}
            {vacancy.questions.map((q) => (
              <div key={q.id}>
                <label className="eyebrow mb-1.5 block">
                  {q.label} {q.required && "*"}
                </label>
                {q.type === "textarea" && (
                  <textarea className="field w-full" rows={5} value={form[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
                )}
                {q.type === "text" && (
                  <input className="field w-full" value={form[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
                )}
                {q.type === "link" && (
                  <input className="field w-full" placeholder="https://…" value={form[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
                )}
                {q.type === "yes_no" && <YesNo label="" value={form[q.id]} onChange={(v) => set(q.id, v)} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 4 — documents */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="display text-2xl text-cream">Documents & media</h2>
            {Object.entries(vacancy.requiredDocs)
              .filter(([, wanted]) => wanted)
              .map(([kind]) => {
                const meta = DOC_META[kind];
                const uploaded = files.find((f) => f.kind === kind);
                const progress = uploading[kind];
                return (
                  <div key={kind} className="glass-subtle p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-cream">
                          {meta.label} <span className="text-emerald-glow">*</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">{meta.hint}</p>
                        {uploaded && (
                          <p className="mt-1.5 text-xs text-emerald-glow">✓ {uploaded.filename}</p>
                        )}
                      </div>
                      <label className="btn btn-ghost btn-sm cursor-pointer">
                        {uploaded ? "Replace" : "Choose file"}
                        <input
                          type="file"
                          className="hidden"
                          accept={meta.accept}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload(kind, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {progress !== undefined && (
                      <div className="mt-3">
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-emerald-glow transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Uploading… {progress}%</p>
                      </div>
                    )}
                  </div>
                );
              })}
            <p className="text-[11px] leading-relaxed text-muted">
              Files are stored privately and are only visible to the H06 recruitment team. Nothing
              you upload here is ever publicly accessible.
            </p>
          </div>
        )}

        {/* STEP 5 — review & submit */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="display text-2xl text-cream">Review & submit</h2>
            <dl className="space-y-3 text-sm">
              <ReviewRow label="Name" value={`${form.firstName ?? ""} ${form.lastName ?? ""}`} />
              <ReviewRow label="Email" value={email} />
              <ReviewRow label="Phone" value={form.phone ?? ""} />
              <ReviewRow label="Based in" value={form.location ?? ""} />
              {vacancy.questions.map((q) => (
                <ReviewRow key={q.id} label={q.label} value={form[q.id] ?? "—"} />
              ))}
              <ReviewRow label="Files" value={files.map((f) => f.filename).join(", ") || "None"} />
            </dl>
            <button className="text-xs text-emerald-glow hover:underline" onClick={() => setStep(1)}>
              ← Edit my answers
            </button>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <label className="flex items-start gap-3 text-xs leading-relaxed text-muted">
                <input type="checkbox" className="mt-0.5" checked={privacyAck} onChange={(e) => setPrivacyAck(e.target.checked)} />
                <span>
                  I have read the{" "}
                  <Link href="/careers/privacy" target="_blank" className="text-cream underline hover:text-emerald-glow">
                    recruitment privacy notice
                  </Link>{" "}
                  (v{vacancy.privacyVersion}) and understand how H06 will handle my information for
                  this recruitment process. *
                </span>
              </label>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-muted">
                <input type="checkbox" className="mt-0.5" checked={talentPool} onChange={(e) => setTalentPool(e.target.checked)} />
                <span>
                  <span className="text-cream">Optional:</span> keep my details on file for up to 12
                  months and contact me about future H06 roles I might suit. I can withdraw this at
                  any time from my dashboard.
                </span>
              </label>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-muted">
                <input type="checkbox" className="mt-0.5" checked={accuracy} onChange={(e) => setAccuracy(e.target.checked)} />
                <span>I confirm the information in this application is true and accurate to the best of my knowledge. *</span>
              </label>
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : "Submit application"}
            </button>
          </div>
        )}

        {error && <p className="mt-5 text-xs text-red-400">{error}</p>}

        {/* nav */}
        {step > 0 && step < 5 && (
          <div className="mt-8 flex justify-between border-t border-white/10 pt-5">
            <button className="btn btn-ghost btn-md" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1}>
              Back
            </button>
            <button className="btn btn-primary btn-md" onClick={next}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <label className="eyebrow mb-2 block">{label}</label>}
      <div className="flex gap-3">
        {(["yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`btn btn-md ${value === v ? "btn-primary" : "btn-ghost"}`}
          >
            {v === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-[11px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="whitespace-pre-wrap text-cream/90">{value || "—"}</dd>
    </div>
  );
}
