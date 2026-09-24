type Ev = 'video_selected' | 'tool_selected' | 'trim_applied' | 'reverse_enabled' | 'rotation_selected' | 'crop_applied' | 'export_started' | 'export_completed' | 'export_cancelled' | 'export_failed' | 'video_downloaded'
// Optional and privacy-safe: forwards only event names and coarse props to Plausible if the site loads it. Never filenames, URLs or media.
export function track(name: Ev, props?: Record<string, string | number | boolean>) {
  try { (window as unknown as { plausible?: (n: string, o?: unknown) => void }).plausible?.(name, { props }) } catch { /* analytics must never break the editor */ }
}
