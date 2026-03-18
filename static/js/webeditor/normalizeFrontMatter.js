// \static\js\webeditor\normalizeFrontMatter.js
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
    log('[serializeFrontMatter] called with normalized:', normalized);
    log('[serializeFrontMatter] fieldOrder:', fieldOrder);
    // Debug: log empty fields and values
    for (const key of fieldOrder) {
        if (normalized[key] === undefined || normalized[key] === "" || normalized[key] === null) {
            log(`[serializeFrontMatter] EMPTY field: ${key} value:`, normalized[key]);
        }
    }
    // Extract lines between --- markers
    const parts = rawFrontMatter.split('---');
    if (parts.length < 2) {
        log('[serializeFrontMatter] invalid rawFrontMatter, returning as-is');
        return rawFrontMatter;
    }
    const lines = parts[1].split('\n');
    // Map of key -> comment lines (above the key)
    const comments = {};
    let lastComment = [];
    let lastKey = null;
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || trimmed === '') {
            lastComment.push(line);
        } else if (trimmed.includes(':')) {
            const key = trimmed.split(':')[0].trim().toLowerCase();
            if (lastComment.length) {
                comments[key] = [...lastComment];
                lastComment = [];
            }
            lastKey = key;
        } else {
            lastComment = [];
        }
    });
    // Compose YAML with comments and schema order
    let out = ['---'];
    for (const key of fieldOrder) {
        if (comments[key]) out.push(...comments[key]);
        if (key in normalized) {
            let value = normalized[key];
            if (Array.isArray(value)) {
                value = `[${value.join(', ')}]`;
            }
            out.push(`${key}: ${value}`);
            // Only log keys with empty values
            if (value === undefined || value === "" || value === null) {
                log(`[serializeFrontMatter] writing EMPTY key: ${key} value:`, value);
            }
        }
    }
    // Add any remaining comments not attached to a key
    for (const k in comments) {
        if (!fieldOrder.includes(k)) out.push(...comments[k]);
    }
    out.push('---');
    log('[serializeFrontMatter] final output:', out.join('\n'));
    return out.join('\n');
}
// \static\js\webeditor\normalizeFrontMatter.js
export function normalizeFrontMatter(mdContent) {
    const front = {};
    const lines = mdContent.split('---')[1]?.split('\n') || [];
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
