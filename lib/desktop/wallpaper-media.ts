/** Device-local UI media, separate from learning files and business databases. */
async function mediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open("geeospace-ui-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("wallpaper");
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
    request.onerror = () => reject(new Error("MEDIA_STORAGE_UNAVAILABLE"));
    request.onblocked = () => { blocked = true; reject(new Error("MEDIA_STORAGE_BLOCKED")); };
  });
}
export async function saveWallpaperVideo(blob: Blob): Promise<void> {
  const db = await mediaDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("wallpaper", "readwrite");
      transaction.objectStore("wallpaper").put(blob, "video");
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error("MEDIA_STORAGE_FAILED"));
    });
  } finally { db.close(); }
}
export async function loadWallpaperVideo(): Promise<Blob | undefined> {
  const db = await mediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("wallpaper", "readonly").objectStore("wallpaper").get("video");
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
      request.onerror = () => reject(new Error("MEDIA_STORAGE_FAILED"));
    });
  } finally { db.close(); }
}
export async function removeWallpaperVideo() {
  const db = await mediaDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("wallpaper", "readwrite");
      transaction.objectStore("wallpaper").delete("video");
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(new Error("MEDIA_STORAGE_FAILED"));
    });
  } finally { db.close(); }
}
