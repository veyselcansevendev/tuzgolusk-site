export function csvCell(value: unknown) {
  const content = String(value ?? "");
  const safe =
    /^\s*[=+@-]/.test(content) || /^[\t\r\n]/.test(content)
      ? "'" + content
      : content;
  return '"' + safe.replaceAll('"', '""') + '"';
}
