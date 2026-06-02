/**
 * Deliberately tiny user-agent parser. We only need coarse buckets for the
 * dashboard (browser / OS / device class), not exhaustive detection — and
 * keeping it small means no dependency shipped to the edge.
 */
export interface ParsedUA {
  browser: string;
  os: string;
  device: "Desktop" | "Mobile" | "Tablet";
}

export function parseUA(ua: string | null): ParsedUA {
  const s = ua || "";

  const browser = matchFirst(s, [
    [/Edg(?:e|A|iOS)?\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/SamsungBrowser/, "Samsung Internet"],
    [/Firefox\/|FxiOS/, "Firefox"],
    // Chrome must be tested before Safari (Chrome UA contains "Safari").
    [/Chrome\/|CriOS/, "Chrome"],
    [/Safari\//, "Safari"],
  ]) ?? "Other";

  const os = matchFirst(s, [
    [/Windows NT/, "Windows"],
    [/iPhone|iPad|iPod/, "iOS"],
    [/Mac OS X/, "macOS"],
    [/Android/, "Android"],
    [/Linux/, "Linux"],
    [/CrOS/, "ChromeOS"],
  ]) ?? "Other";

  let device: ParsedUA["device"] = "Desktop";
  if (/iPad|Tablet|(Android(?!.*Mobile))/.test(s)) device = "Tablet";
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/.test(s)) device = "Mobile";

  return { browser, os, device };
}

function matchFirst(
  input: string,
  pairs: ReadonlyArray<readonly [RegExp, string]>,
): string | null {
  for (const [re, label] of pairs) {
    if (re.test(input)) return label;
  }
  return null;
}
