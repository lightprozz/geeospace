export function connectSpaceOS(onContext) {
  const parentOrigin = document.querySelector('meta[name="spaceos-parent-origin"]').content;
  const embedded = window.parent !== window && Boolean(parentOrigin);
  let instanceId;
  if (embedded) {
    window.addEventListener("message", event => {
      if (event.origin !== parentOrigin || event.source !== window.parent) return;
      const data = event.data;
      if (data?.type !== "spaceos:init" || data.version !== 1 ||
          typeof data.instanceId !== "string" || !data.instanceId || data.instanceId.length > 200 ||
          (instanceId && instanceId !== data.instanceId) || !["vi", "en"].includes(data.locale) ||
          !["light", "dark"].includes(data.theme) || typeof data.visible !== "boolean" ||
          typeof data.reducedMotion !== "boolean") return;
      instanceId = data.instanceId;
      document.documentElement.dataset.presentation = "embedded";
      document.documentElement.dataset.theme = data.theme;
      document.documentElement.dataset.reducedMotion = String(data.reducedMotion);
      onContext(data);
    });
    window.parent.postMessage({ type: "spaceos:ready", version: 1 }, parentOrigin);
  }
  return {
    embedded,
    send: payload => {
      if (embedded && instanceId) window.parent.postMessage({ ...payload, version: 1, instanceId }, parentOrigin);
    },
  };
}
