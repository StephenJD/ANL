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
