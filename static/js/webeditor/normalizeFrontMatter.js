import { fieldSchema } from './fieldSchema.js';
// Helper: normalize a front-matter value for select fields (e.g. access)
function normalizeFrontMatterValue(key, value) {
    // For access and similar fields, always use first element if array
    if (Array.isArray(value)) value = value[0] || '';
    // Lower-case all values except title and summary
    if (key === 'title' || key === 'summary') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase();
    }
    if (Array.isArray(value)) {
        return value.map(v => typeof v === 'string' ? v.toLowerCase() : v);
    }
    return value;
}

// Serializes a normalized front-matter object to YAML, preserving comments and order from the original raw front-matter.
// - rawFrontMatter: the original front-matter string (excluding ---, including comments)
// - normalized: the normalized object (key-value pairs)
// - fieldOrder: array of keys in desired order (from fieldSchema.fields)
export function serializeFrontMatter(rawFrontMatter, normalized, fieldOrder) {
    let fieldDefs = fieldSchema && fieldSchema.fields ? fieldSchema.fields : [];
    // Map of key -> required
    let requiredMap = {};
    let frontMatterKeys = new Set();
    fieldDefs.forEach(f => {
        if (f.frontMatter !== false) {
            frontMatterKeys.add(f.key);
            if (f.required) requiredMap[f.key] = true;
        }
    });

    // Derive 'type' from schema if page_type or content_type are present/changed
    if (typeof fieldSchema !== 'undefined' && typeof fieldSchema.deriveType === 'function') {
        if ('page_type' in normalized || 'content_type' in normalized) {
            const derivedType = fieldSchema.deriveType(normalized);
            if (derivedType) {
                normalized.type = derivedType;
                frontMatterKeys.add('type');
                if (!fieldOrder.includes('type')) fieldOrder.push('type');
            }
        }
    }

    // Compose YAML with schema order, no --- markers
    let out = [];
    for (const key of fieldOrder) {
        if (!frontMatterKeys.has(key)) continue;
        if (key in normalized) {
            let value = normalized[key];
            // Only include if required or non-empty/non-false
            if (requiredMap[key] || (value !== undefined && value !== null && value !== '' && value !== false)) {
                if (Array.isArray(value)) {
                    value = value.map(v => (key === 'title' || key === 'summary') ? v : (typeof v === 'string' ? v.toLowerCase() : v));
                    value = `[${value.join(', ')}]`;
                } else if (typeof value === 'string' && key !== 'title' && key !== 'summary') {
                    value = value.toLowerCase();
                }
                out.push(`${key}: ${value}`);
            }
        }
    }
    // Optionally trigger resize after update (if function available)
    if (typeof autoSizeFrontMatter === 'function') {
        setTimeout(() => autoSizeFrontMatter(), 0);
    }
    return out.join('\n');
}

// \static\js\webeditor\normalizeFrontMatter.js
export function normalizeFrontMatter(mdContent) {
    const front = {};
    const lines = mdContent.split('\n');
    lines.forEach(line => {
        let cleaned = line.split('#')[0].trim();
        if(!cleaned) return;
        let [key, ...rest] = cleaned.split(':');
        key = key.trim().toLowerCase();
        let value = rest.join(':').trim();
        if(value.startsWith('[') && value.endsWith(']')) {
            value = value
                .slice(1,-1)
                .split(',')
                .map(v => v.trim());
        }
        value = normalizeFrontMatterValue(key, value);
        front[key] = value;
    });
    return front;
}
