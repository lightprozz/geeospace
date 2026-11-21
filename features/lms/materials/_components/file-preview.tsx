"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getValidToken } from "@/lib/auth/token";

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false, loading: () => <p role="status">Loading PDF viewer…</p> });

export function FilePreview({ url, name }: { url: string; name: string }) {
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    void (async () => {
      try {
        const token = await getValidToken();
        const response = await fetch(url, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!response.ok) throw new Error("Preview failed");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  if (failed) return <p role="alert">Unable to load preview.</p>;
  if (!source) return <p role="status">Loading preview…</p>;
  return name.toLowerCase().endsWith(".pdf") ? <PdfPreview url={source} /> : <iframe title={`Preview: ${name}`} src={source} className="w-full h-full" sandbox="" />;
}
