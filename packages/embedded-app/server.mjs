export function parentOrigin(value = process.env.SPACEOS_PARENT_ORIGIN) {
  if (!value) return "";
  const url = new URL(value);
  if (url.origin !== value || (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))) {
    throw new Error("SPACEOS_PARENT_ORIGIN must be an exact HTTPS or loopback origin");
  }
  return value;
}

export function appHeaders() {
  return [
    { key: "Content-Security-Policy", value: `frame-ancestors ${parentOrigin() || "'none'"}; base-uri 'self'; object-src 'none'` },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Cache-Control", value: "private, no-store" },
  ];
}

export function privateJson(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
