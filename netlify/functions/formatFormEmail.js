// netlify/functions/formatFormEmail.js
// Universal formatter: accepts many Netlify webhook shapes (array/object) and returns a readable text body.

const skipKeys = new Set(['_gotcha','_honey','bot-field','form-name','form_name','form-name','submit']);

function tryParseJSON(s){
  try { return typeof s === 'string' ? JSON.parse(s) : s; } catch(e){ return null; }
}

function tidyLabel(key){
  if (!key) return '';
  return String(key)
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function arrayToEntries(arr){
  // arr elements may be {name,value} or {field,value} or simple values
  const out = [];
  for (const it of arr){
    if (!it) continue;
    if (typeof it === 'object' && ('name' in it || 'field' in it)) {
      out.push([it.name || it.field, (it.value === undefined ? '' : it.value)]);
    } else if (Array.isArray(it) && it.length >= 2) {
      out.push([it[0], it[1]]);
    } else {
      out.push([String(it), '']);
    }
  }
  return out;
}

exports.handler = async (event) => {
  // parse body if JSON
  const raw = tryParseJSON(event.body) || event.body || {};

  // Netlify's webhook often includes a `payload` object
  const payload = raw.payload || raw;
  const formName = (payload.form_name || payload.formName || payload.name || payload['form-name'] || 'Untitled Form');

  // locate form data in multiple possible shapes
  let rawData = payload.data || payload.form_data || payload['submission'] || payload.fields || payload || {};

  // If rawData is a string attempt parse
  if (typeof rawData === 'string') {
    const p = tryParseJSON(rawData);
    if (p) rawData = p;
  }

  // normalize into ordered entries
  let entries = [];
  if (Array.isArray(rawData)) {
    entries = arrayToEntries(rawData);
  } else if (rawData && typeof rawData === 'object') {
    // If object values are arrays like {field: ["a","b"]} keep them as multiple entries
    for (const [k,v] of Object.entries(rawData)) {
      if (skipKeys.has(k)) continue;
      if (Array.isArray(v)) {
        for (const vv of v) entries.push([k, vv]);
      } else {
        entries.push([k, v]);
      }
    }
  } else {
    entries = [['data', String(rawData)]];
  }

  // Format into readable text, group contiguous keys that look like they belong together is possible later.
  let out = `Form Submission: ${formName}\n\n`;

  for (const [key, val] of entries) {
    if (!key) continue;
    if (skipKeys.has(key)) continue;
    const label = tidyLabel(key);
    // Normalize boolean-like values from "on"/"true"/"yes"
    let value = (val === null || val === undefined) ? '' : String(val);
    const lower = value.toLowerCase();
    if (lower === 'on' || lower === 'true') value = 'Yes';
    if (lower === 'false') value = 'No';
    if (value === '') value = '—';
    out += `${label}:\n${value}\n\n`;
  }

  // Log (Netlify function logs)
  console.log('Formatted submission:\n', out);

  // Return the formatted text (for testing). Later we will send it via email.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, formatted: out }),
  };
};
