/** Vite's public base, including GitHub Pages' repository subdirectory. */
const defaultBase = import.meta.env ? import.meta.env.BASE_URL : '/';

export function publicUrl(path: string, base = defaultBase): string {
  if (!path.startsWith('/') || path.startsWith('//') || base === '/') return path;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (path.startsWith(prefix)) return path;
  return `${prefix}${path.slice(1)}`;
}

/** Resolve asset references in generated HTML, including inline backgrounds. */
export function publicHtml(html: string, base = defaultBase): string {
  return html.replace(/(["'(])\/(art\/|audio\/)/g, (_, quote: string, directory: string) =>
    `${quote}${publicUrl(`/${directory}`, base)}`);
}

