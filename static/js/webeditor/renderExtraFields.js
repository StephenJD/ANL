// \static/js\webeditor\renderExtraFields.js

function renderExtraFields(form, frontMatter) {
    Object.entries(frontMatter).forEach(([k,v]) => {
        if(['title','page_type','summary','access','content_type','navigation_options'].includes(k)) return;

        const label = document.createElement("label");
        label.textContent = k;
        label.style.display = "block";
        label.style.marginTop = "10px";

        const input = document.createElement("input");
        input.type = "text";
        input.name = k;
        input.value = Array.isArray(v) ? JSON.stringify(v) : v;
        input.style.width = "320px";

        form.appendChild(label);
        form.appendChild(input);
        log(`Rendered extra field: ${k} = ${input.value}`);
    });
}
