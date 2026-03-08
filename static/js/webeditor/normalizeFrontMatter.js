// \static\js\webeditor\normalizeFrontMatter.js
window.normalizeFrontMatter = function (mdContent) {
    const front = {};
    const lines = mdContent.split('---')[1]?.split('\n') || [];
    lines.forEach(line => {
        let cleaned = line.split('#')[0].trim();
        if(!cleaned) return;
        let [key, ...rest] = cleaned.split(':');
        key = key.trim().toLowerCase();
        let value = rest.join(':').trim();
        if(value.startsWith('[') && value.endsWith(']')) {
            value = JSON.parse(value.toLowerCase());
        } else {
            value = value.toLowerCase();
        }
        front[key] = value;
    });
    return front;
}
