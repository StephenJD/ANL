// \static/js\webeditor\renderAccessOptions.js

export async function renderAccessOptions(form, frontMatter, cache){
    const accessLabel = document.createElement("label");
    accessLabel.textContent = "Access";
    accessLabel.style.display = "block";
    accessLabel.style.marginTop = "10px";

    const accessSelect = document.createElement("select");
    accessSelect.name = "access";
    accessSelect.style.width = "320px";

    form.appendChild(accessLabel);
    form.appendChild(accessSelect);

    const frontValue = frontMatter.access || 'public';
    log(`Access front matter value: ${frontValue}`);

    let options = cache || [];
    if(!cache) {
        try {
            const res = await fetch("/.netlify/functions/get_role_options");
            if(!res.ok) throw new Error("HTTP " + res.status);
            options = await res.json();
            options = options.map(o => o.Role);
            options.unshift('Public');
        } catch(err) {
            log("Access fetch error: " + err);
            options = ['Public'];
        }
    } else {
        options = ['Public', ...options.map(o => o.Role)];
    }

    options.forEach(optVal => {
        const opt = document.createElement("option");
        opt.value = optVal.toLowerCase();
        opt.textContent = optVal;
        if(Array.isArray(frontValue)) {
            if(frontValue.includes(optVal.toLowerCase())) opt.selected = true;
        } else {
            if(frontValue === optVal.toLowerCase()) opt.selected = true;
        }
        accessSelect.appendChild(opt);
        log(`Added Access option: ${optVal}${opt.selected ? ' (selected)' : ''}`);
    });
}
