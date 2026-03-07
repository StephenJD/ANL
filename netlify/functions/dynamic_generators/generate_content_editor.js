// /netlify/functions/dynamic_generators/generate_content_editor.js

let roleCache = null;

export async function generateContentEditor(frontmatter, filePath) {

    const tree = document.getElementById("tree");
    const editor = document.getElementById("editor");

    tree.style.display = "none";
    editor.innerHTML = "";

    const form = document.createElement("form");
    form.id = "editForm";

    console.log("Rendering editor for:", filePath);

    function addLabel(text) {
        const label = document.createElement("label");
        label.textContent = text;
        label.style.display = "block";
        label.style.marginTop = "12px";
        return label;
    }

    function addInput(name, value = "", required = false) {
        const input = document.createElement("input");
        input.type = "text";
        input.name = name;
        input.value = value || "";
        input.required = required;
        input.style.width = "100%";
        return input;
    }

    function addTextarea(name, value = "") {
        const ta = document.createElement("textarea");
        ta.name = name;
        ta.rows = 4;
        ta.value = value || "";
        ta.style.width = "100%";
        return ta;
    }

    function addSelect(name, options, selected) {
        const select = document.createElement("select");
        select.name = name;
        select.style.width = "100%";

        options.forEach(opt => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            if (opt === selected) o.selected = true;
            select.appendChild(o);
        });

        return select;
    }

    async function getRoles() {

        if (roleCache) {
            console.log("Access roles loaded from cache");
            return roleCache;
        }

        console.log("Fetching access roles from network");

        const res = await fetch("/.netlify/functions/get_role_options");
        const data = await res.json();

        if (!Array.isArray(data)) {
            console.warn("Role options not array:", data);
            roleCache = [];
        } else {
            roleCache = data.map(r => typeof r === "string" ? r : (r.name || r.role || ""));
        }

        console.log("Access roles:", roleCache);

        return roleCache;
    }

    // -----------------------------
    // PAGE TYPE
    // -----------------------------

    form.appendChild(addLabel("Page Type"));

    const pageType = addSelect(
        "page_type",
        ["content page", "navigation page"],
        frontmatter.page_type || "content page"
    );

    form.appendChild(pageType);

    console.log("Rendered Page Type");

    // container for dynamic options
    const subOptionsDiv = document.createElement("div");
    form.appendChild(subOptionsDiv);

    function renderSubOptions() {

        subOptionsDiv.innerHTML = "";

        if (pageType.value === "content page") {

            const select = addSelect(
                "content_mode",
                [
                    "page from single file",
                    "page from section files"
                ],
                frontmatter.content_mode
            );

            subOptionsDiv.appendChild(addLabel("Content Type"));
            subOptionsDiv.appendChild(select);

            console.log("Rendered Sub-options for content page");

        } else {

            const select = addSelect(
                "navigation_mode",
                [
                    "With see-also links",
                    "without see-also links"
                ],
                frontmatter.navigation_mode
            );

            subOptionsDiv.appendChild(addLabel("Navigation Options"));
            subOptionsDiv.appendChild(select);

            console.log("Rendered Sub-options for navigation page");
        }
    }

    pageType.addEventListener("change", renderSubOptions);
    renderSubOptions();

    // -----------------------------
    // TITLE
    // -----------------------------

    form.appendChild(addLabel("Title"));
    form.appendChild(addInput("title", frontmatter.title, true));

    console.log("Rendered Title");

    // -----------------------------
    // SUMMARY
    // -----------------------------

    form.appendChild(addLabel("Summary"));
    form.appendChild(addTextarea("summary", frontmatter.summary));

    console.log("Rendered Summary");

    // -----------------------------
    // ACCESS
    // -----------------------------

    const roles = await getRoles();

    form.appendChild(addLabel("Access"));

    const accessSelect = addSelect(
        "access",
        roles,
        frontmatter.access
    );

    form.appendChild(accessSelect);

    console.log("Rendered Access from network");

    // -----------------------------
    // BUTTONS
    // -----------------------------

    const buttonRow = document.createElement("div");
    buttonRow.style.marginTop = "20px";

    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";

    cancel.onclick = () => {
        editor.innerHTML = "";
        tree.style.display = "block";
    };

    buttonRow.appendChild(save);
    buttonRow.appendChild(cancel);

    form.appendChild(buttonRow);

    editor.appendChild(form);

    console.log("Editor rendered");
}
