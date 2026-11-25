"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const bucket = "driver-vehicle-documents";
const documentTypes = ["image/jpeg", "image/png", "application/pdf"];

export function VehicleDetailsForm({ userId }: { userId: string }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const draftId = useRef<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [opening, setOpening] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [savedPlate, setSavedPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    cameraRequest.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function openCamera() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Open this site over HTTPS on your phone to use the camera.");
      return;
    }
    setOpening(true);
    const request = ++cameraRequest.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (cameraRequest.current !== request || !video.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      video.current.srcObject = next;
      setCamera(true);
      setPhoto(null);
    } catch {
      setMessage("Allow camera access in your browser, then try again.");
    } finally {
      if (cameraRequest.current === request) setOpening(false);
    }
  }

  function closeCamera() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamera(false);
  }

  function takeSelfie() {
    const frame = video.current;
    if (!frame?.videoWidth || !frame.videoHeight) {
      setMessage("Wait for the camera preview, then try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 960 / Math.max(frame.videoWidth, frame.videoHeight));
    canvas.width = Math.round(frame.videoWidth * scale);
    canvas.height = Math.round(frame.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(frame, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setMessage("Could not capture the photo. Please try again.");
        return;
      }
      setMessage("");
      setPhoto(blob);
      closeCamera();
    }, "image/jpeg", 0.85);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitted) return;
    setMessage("");
    const form = new FormData(event.currentTarget);
    const plate = savedPlate || String(form.get("vehicle_number") ?? "").toUpperCase().replace(/[\s-]/g, "");
    const rc = form.get("rc");
    const license = form.get("license");
    if (!/^[A-Z0-9]{6,15}$/.test(plate)) {
      setMessage("Enter a valid vehicle number, for example MH12AB1234.");
      return;
    }
    if (!draftId.current && (!(rc instanceof File) || !(license instanceof File) ||
      [rc, license].some((file) => !documentTypes.includes(file.type) || !file.size || file.size > 4194304))) {
      setMessage("Choose a PDF, JPG or PNG up to 4 MB for each document.");
      return;
    }
    if (!photo) {
      setMessage("Take a selfie using the camera.");
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      setMessage("Vehicle details are temporarily unavailable.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserClient(url, key);
    const storage = supabase.storage.from(bucket);
    const documentNames = ["rc", "license", "selfie.jpg"] as const;
    const uploaded: string[] = [];
    try {
      if (!draftId.current) {
        const id = crypto.randomUUID();
        if (!(rc instanceof File) || !(license instanceof File)) return;
        for (const [name, file] of [["rc", rc], ["license", license], ["selfie.jpg", photo]] as const) {
          const path = `${userId}/${id}/${name}`;
          uploaded.push(path);
          const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
          if (error) throw error;
        }
        draftId.current = id;
        setSavedPlate(plate);
      }

      const { data, error } = await supabase.rpc("submit_driver_vehicle_details", {
        registration: plate,
        document_upload_id: draftId.current,
      });
      if (error) throw error;
      if (!data) {
        const { data: existing } = await supabase.from("driver_vehicle_details")
          .select("vehicle_number").eq("driver_id", userId).maybeSingle();
        if (!existing) throw new Error("Submission could not be confirmed");
        const paths = documentNames.map((name) => `${userId}/${draftId.current}/${name}`);
        await storage.remove(paths);
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      if (!draftId.current && uploaded.length) await storage.remove(uploaded).catch(() => undefined);
      setMessage("We couldn't save your vehicle details. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return <p role="status">Vehicle details submitted.</p>;

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-[#50645c]">Submit these details once. Companies see your vehicle number when you request their loads.</p>
      <fieldset disabled={busy || draftId.current !== null} className="grid gap-4 sm:max-w-lg">
        <label className="field">Vehicle number
          <input name="vehicle_number" placeholder="MH12AB1234" autoCapitalize="characters" maxLength={20} required />
        </label>
        <label className="field">Vehicle RC
          <input type="file" name="rc" accept=".pdf,.jpg,.jpeg,.png" required />
        </label>
        <label className="field">Driving licence
          <input type="file" name="license" accept=".pdf,.jpg,.jpeg,.png" required />
        </label>
        <p className="text-sm text-[#50645c]">PDF or photo, up to 4 MB per document.</p>
        <div className="grid justify-items-start gap-2">
          <video ref={video} hidden={!camera} autoPlay muted playsInline className="max-w-full rounded-xl sm:max-w-xs" />
          {photo && !camera && preview && <picture><img src={preview} alt="Your captured selfie" className="w-32 rounded-xl" /></picture>}
          {camera ? <div className="flex flex-wrap gap-3">
            <button className="text-link" type="button" onClick={takeSelfie}>Capture selfie</button>
            <button className="text-link" type="button" onClick={closeCamera}>Close camera</button>
          </div> : <button className="text-link" type="button" disabled={opening} onClick={openCamera}>
            {opening ? "Opening camera…" : photo ? "Retake selfie" : "Open camera for selfie"}
          </button>}
        </div>
      </fieldset>
      {message && <p role="alert" className="mt-3 text-sm text-rose-900">{message}</p>}
      <button className="button mt-4" type="submit" disabled={busy || opening || camera}>
        {busy ? "Saving vehicle details…" : "Save vehicle details"}
      </button>
    </form>
  );
}
