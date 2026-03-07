// \netlify\functions\dynamic_generators\generate_content_editor.js

export default async function generate_content_editor() {

return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

<div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

<div id="editor" style="flex:1;">

<form id="editForm"></form>

<div style="margin-top:20px;">
<button type="button" onclick="saveEdit()">Save</button>
<button type="button" onclick="publishEdits()">Publish</button>
<button type="button" onclick="cancelEdit()">Cancel</button>
</div>

</div>

</div>

<!-- Log container -->
<div id="logDiv" style="
    border-top:1px solid #ccc;
    margin-top:20px;
    padding:10px;
    max-height:200px;
    overflow-y:auto;
    background:#f9f9f9;
    font-size:12px;
    white-space:pre-wrap;
"></div>

<script>

// =====================
// Logger
// =====================
function log(msg) {
    const logDiv = document.getElementById("logDiv");
    logDiv.textContent += msg + "\\n";
    logDiv.scrollTop = logDiv.scrollHeight;
}

// =====================
// Globals
// =====================
let currentFile = null;
let rawBody = "";
let accessOptionsCache = null;
let frontMatterFields = {};

// =====================
// Load Tree
// =====================
async function loadTree() {
    try {
        const res = await fetch("/.netlify/functions/list_content_tree");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const tree = await res.json();
        log("Tree loaded successfully");
        document.getElementById("tree").appendChild(renderTree(tree));
    } catch (err) {
        log("loadTree error: " + err);
    }
}

// =====================
// Render Tree
// =====================
function renderTree(nodes) {
    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "15px";

    nodes.forEach(node => {
        const li = document.createElement("li");

        if(node.type === "folder") {
            li.style.fontWeight = "bold";
            li.textContent = node.name;
            li.appendChild(renderTree(node.children));
        } else {
            const a = document.createElement("a");
            a.href = "#";
            a.textContent = node.name;
            a.style.display = "block";
            a.style.cursor = "pointer";
            a.onclick = (e) => {
                e.preventDefault();
                log("Clicked file: " + node.path);
                startEdit(node.path).catch(err => log("startEdit error: " + err));
            };
            li.appendChild(a);
        }

        ul.appendChild(li);
    });

    return ul;
}

// =====================
// Start Editing
// =====================
async function startEdit(file) {
    try {
        log("startEdit called for " + file);
        currentFile = file;

        // Hide tree when form is active
        document.getElementById("tree").style.display = "none";

        const res = await fetch("/.netlify/functions/start_edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file })
        });

        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        parseMarkdown(data.content);
        log("File loaded: " + file);
    } catch (err) {
        log("startEdit error: " + err);
    }
}

// =====================
// Cancel Edit
// =====================
function cancelEdit() {
    currentFile = null;
    rawBody = "";
    frontMatterFields = {};
    document.getElementById("editForm").innerHTML = "";
    document.getElementById("tree").style.display = "block";
    log("Edit canceled, tree restored");
}

// =====================
// Parse Markdown with comment-stripping & normalization
// =====================
function parseMarkdown(md) {
    const parts = md.split("---");
    const front = parts[1] || "";
    rawBody = parts.slice(2).join("---");

    const lines = front.split("\\n");
    frontMatterFields = {};

    lines.forEach(line => {
        const i = line.indexOf(":");
        if(i > 0) {
            const key = line.slice(0,i).trim();
            let value = line.slice(i+1).trim();
            // Strip comment
            const commentIndex = value.indexOf("#");
            if(commentIndex >= 0) value = value.slice(0, commentIndex).trim();

            // Normalize arrays
            if(value.startsWith("[") && value.endsWith("]")) {
                try {
                    const arr = JSON.parse(value.replace(/'/g,'"'));
                    frontMatterFields[key] = arr.map(v => v.toString().toLowerCase());
                } catch(e) {
                    frontMatterFields[key] = [value.slice(1,-1).toLowerCase()];
                }
            } else {
                frontMatterFields[key] = value;
            }
        }
    });

    log("Parsed front matter: " + JSON.stringify(frontMatterFields));
    renderForm(frontMatterFields);
}

// =====================
// Render Form
// =====================
async function renderForm(fields) {
    const form = document.getElementById("editForm");
    form.innerHTML = "";

    // --- Page Type ---
    const pageTypeLabel = document.createElement("label");
    pageTypeLabel.textContent = "Page type";
    pageTypeLabel.style.display = "block";
    pageTypeLabel.style.marginTop = "10px";
    const pageTypeSelect = document.createElement("select");
    ["content page","navigation page"].forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        if(fields["page_type"] === v) opt.selected = true;
        pageTypeSelect.appendChild(opt);
    });
    pageTypeSelect.name = "page_type";
    pageTypeSelect.style.width = "320px";
    pageTypeSelect.onchange = () => renderSubOptions(pageTypeSelect.value, form, fields);
    form.appendChild(pageTypeLabel);
    form.appendChild(pageTypeSelect);
    log("Rendered Page Type");

    // --- Title ---
    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Title (required)";
    titleLabel.style.display = "block";
    titleLabel.style.marginTop = "10px";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = fields["title"] || "";
    titleInput.name = "title";
    titleInput.style.width = "320px";
    form.appendChild(titleLabel);
    form.appendChild(titleInput);
    log("Rendered Title");

    // --- Summary ---
    const summaryLabel = document.createElement("label");
    summaryLabel.textContent = "Summary (optional)";
    summaryLabel.style.display = "block";
    summaryLabel.style.marginTop = "10px";
    const summaryInput = document.createElement("textarea");
    summaryInput.name = "summary";
    summaryInput.value = fields["summary"] || "";
    summaryInput.rows = 3;
    summaryInput.style.width = "320px";
    form.appendChild(summaryLabel);
    form.appendChild(summaryInput);
    log("Rendered Summary");

    // --- Access ---
    const accessLabel = document.createElement("label");
    accessLabel.textContent = "Access";
    accessLabel.style.display = "block";
    accessLabel.style.marginTop = "10px";
    const accessSelect = document.createElement("select");
    accessSelect.name = "access";
    accessSelect.style.width = "320px";
    form.appendChild(accessLabel);
    form.appendChild(accessSelect);

    const frontValue = fields["access"] || ["public"];
    log("Access front matter value: " + JSON.stringify(frontValue));

    const ensureArray = Array.isArray(frontValue) ? frontValue : [frontValue];
    const normalizedFront = ensureArray.map(v => v.toString().toLowerCase());

    if(accessOptionsCache) {
        log("Rendering Access options from cache: " + JSON.stringify(accessOptionsCache));
        populateAccessOptions(normalizedFront, accessSelect, accessOptionsCache);
    } else {
        try {
            const res = await fetch("/.netlify/functions/get_role_options");
            if(!res.ok) throw new Error("HTTP " + res.status);
            const options = await res.json();
            accessOptionsCache = options;
            log("Rendering Access options from network: " + JSON.stringify(options));
            populateAccessOptions(normalizedFront, accessSelect, options);
        } catch(err) {
            log("Access fetch error: " + err);
        }
    }

    // --- Sub-options based on Page Type ---
    renderSubOptions(pageTypeSelect.value, form, fields);

    // --- Extra fields ---
    Object.keys(fields).forEach(k => {
        if(!["title","summary","page_type","access"].includes(k)) {
            log('Rendered extra field: ' + k + ' = ' + JSON.stringify(fields[k]));
        }
    });
}

// =====================
// Populate Access Options
// =====================
function populateAccessOptions(frontValues, selectEl, options) {
    const allRoles = ["public"].concat(options.map(o => o.Role));
    allRoles.forEach(role => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = role;
        if(frontValues.includes(role.toLowerCase())) opt.selected = true;
        selectEl.appendChild(opt);
        log("Added Access option: " + role + (opt.selected ? " (selected)" : ""));
    });
    log("Rendered Access options complete");
}

// =====================
// Render Sub-options
// =====================
function renderSubOptions(pageType, form, fields) {
    // Remove any existing sub-options container
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
            if(fields["content_type"] === v) opt.selected = true;
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
            if(fields["navigation_options"] === v) opt.selected = true;
            select.appendChild(opt);
        });
        container.appendChild(label);
        container.appendChild(select);
    }

    form.appendChild(container);
    log("Rendered Sub-options for " + pageType);
}

// =====================
// Build Markdown
// =====================
function buildMarkdown() {
    const form = document.getElementById("editForm");
    const data = new FormData(form);

    let front = "---\\n";
    for(const [k,v] of data.entries()) {
        front += k + ": " + v + "\\n";
    }
    front += "---\\n";

    return front + rawBody;
}

// =====================
// Save Edit
// =====================
async function saveEdit() {
    try {
        const content = buildMarkdown();
        const res = await fetch("/.netlify/functions/save_edit", {
            method: "POST",
            body: JSON.stringify({ file: currentFile, content })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        log("Saved: " + currentFile);
        document.getElementById("tree").style.display = "block";
    } catch (err) {
        log("saveEdit error: " + err);
    }
}

// =====================
// Publish Edits
// =====================
async function publishEdits() {
    try {
        const res = await fetch("/.netlify/functions/publish_edits", { method: "POST" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        log("All edits published");
        document.getElementById("tree").style.display = "block";
    } catch (err) {
        log("publishEdits error: " + err);
    }
}

// =====================
// Init
// =====================
loadTree();

</script>

</div>
`;
}
