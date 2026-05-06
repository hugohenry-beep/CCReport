import AdmZip from "adm-zip";

export interface NamedFile {
  name: string;
  buffer: Buffer;
}

export function unzipBuffer(buf: Buffer): NamedFile[] {
  const zip = new AdmZip(buf);
  const out: NamedFile[] = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (!/\.xlsx$/i.test(entry.entryName)) continue;
    const leaf = entry.entryName.split("/").pop() ?? entry.entryName;
    if (leaf.startsWith(".") || leaf.startsWith("__MACOSX")) continue;
    out.push({ name: leaf, buffer: entry.getData() });
  }
  return out;
}

export function isZip(name: string): boolean {
  return /\.zip$/i.test(name);
}

export function isXlsx(name: string): boolean {
  return /\.xlsx$/i.test(name);
}
