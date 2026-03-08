// \static/js\webeditor\renderSubOptions.js

window.renderSubOptions = function(pageType, form, frontMatter) {
    let existing = document.getElementById("subOptionsContainer");
    if(existing) form.removeChild(existing);

    const container = document.createElement("div");
    container.id = "subOptionsContainer";
    container.style.marginTop = "10px";

    if(pageType === "content page") {
        const label = document.createElement("label");
        label.textContent = "Content Type";
        label.style.display = "block";
        const select = document.createElement("select");
        select.name = "content_type";
        select.style.width = "320px";
        ["page from single file","page from section files"].forEach(v => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.textContent = v;
            if(frontMatter.content_type === v) opt.selected = true;
            select.appendChild(opt);
        });
        container.appendChild(label);
        container.appendChild(select);
    } else if(pageType === "navigation page") {
        const label = document.createElement("label");
        label.textContent = "Navigation Options";
        label.style.display = "block";
        const select = document.createElement("select");
        select.name = "navigation_options";
        select.style.width = "320px";
        ["With see-also links","Without see-also links"].forEach(v => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.textContent = v;
            if(frontMatter.navigation_options === v) opt.selected = true;
            select.appendChild(opt);
        });
        container.appendChild(label);
        container.appendChild(select);
    }

    form.appendChild(container);
    log("Rendered Sub-options for " + pageType);
}
