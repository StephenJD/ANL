// Serializes a normalized front-matter object to YAML, preserving comments and order from the original raw front-matter.
// - rawFrontMatter: the original front-matter string (including --- and comments)
// - normalized: the normalized object (key-value pairs)
// - fieldOrder: array of keys in desired order (from fieldSchema.fields)
export function serializeFrontMatter(rawFrontMatter, normalized, fieldOrder) {
    // Extract lines between --- markers
    const parts = rawFrontMatter.split('---');
    if (parts.length < 2) return rawFrontMatter;
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
        }
    }
    // Add any remaining comments not attached to a key
    for (const k in comments) {
        if (!fieldOrder.includes(k)) out.push(...comments[k]);
    }
    out.push('---');
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

} else {

    value = value;

}
        front[key] = value;
    });
    return front;
}
