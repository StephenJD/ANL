// /netlify/functions/formatFormData.js
export function formatFormData ({ record, includeUnselected = false}) {
  if (!record || typeof record !== "object") {
    console.warn("[DEBUG] formatFormData: No record provided!", { record });
    return "";
  }
  const output = [];
  const space = "&nbsp;".repeat(4);

  function processValue(label, value, level = 0) {
    const ind = "&nbsp;".repeat(level * 4);
    if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
      if (includeUnselected) return `${ind}<strong>${label}</strong> <s>None</s>`;
      return null;
    }

    if (Array.isArray(value)) {
      const lines = value.map(v => processValue(null, v, level + 1)).filter(Boolean);
      if (label) lines.unshift(`${ind}<strong>${label}</strong>`);
      return lines.join("<br>");
    }

    if (typeof value === "object") {
      const lines = [];
      for (const k in value) {
        const subValue = value[k];
        lines.push(processValue(`${label ? label + " (" + k + ")" : k}`, subValue, level + 1));
      }
      return lines.filter(Boolean).join("<br>");
    }

    return `${ind}${label ? `${label} ` : ""}${value}`;
  }

  for (const key in record) {
    const line = processValue(key.charAt(0).toUpperCase() + key.slice(1), record[key], 1);
    if (line) output.push(line);
  }

  return output.filter(l => l && l.trim() !== "").join("<br>");
}
