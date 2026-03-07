// /netlify/functions/dynamic_generators/generate_content_editor.js

let roleCache = null;

export async function generateContentEditor(frontmatter, filePath) {

    async function getRoles() {
        if (roleCache) return roleCache;

        const res = await fetch("/.netlify/functions/get_role_options");
        const data = await res.json();
        roleCache = Array.isArray(data) ? data.map(r => typeof r === "string" ? r : (r.name || r.role || "")) : [];
        return roleCache;
    }

    const roles = await getRoles();

    // -----------------------------
    // PAGE TYPE OPTIONS
    // -----------------------------
    const pageTypeOptions = ["content page", "navigation page"];
    const contentModeOptions = ["page from single file", "page from section files"];
    const navigationModeOptions = ["With see-also links", "without see-also links"];

    const pageType = frontmatter.page_type || "content page";

    // Determine sub-options HTML
    let subOptionsHTML = "";
    if (pageType === "content page") {
        const selectedContentMode = frontmatter.content_mode || "";
        subOptionsHTML = `
            <label>Content Type</label>
            <select name="content_mode">
                ${contentModeOptions.map(opt => `<option ${selectedContentMode === opt ? "selected" : ""}>${opt}</option>`).join("")}
            </select>
        `;
    } else {
        const selectedNavMode = frontmatter.navigation_mode || "";
        subOptionsHTML = `
            <label>Navigation Options</label>
            <select name="navigation_mode">
                ${navigationModeOptions.map(opt => `<option ${selectedNavMode === opt ? "selected" : ""}>${opt}</option>`).join("")}
            </select>
        `;
    }

    // -----------------------------
    // BUILD HTML
    // -----------------------------
    return `
        <form id="editForm">

            <label>Page Type</label>
            <select name="page_type">
                ${pageTypeOptions.map(opt => `<option ${pageType === opt ? "selected" : ""}>${opt}</option>`).join("")}
            </select>

            ${subOptionsHTML}

            <label>Title</label>
            <input type="text" name="title" value="${frontmatter.title || ""}" required />

            <label>Summary</label>
            <textarea name="summary">${frontmatter.summary || ""}</textarea>

            <label>Access</label>
            <select name="access">
                ${roles.map(r => `<option ${frontmatter.access === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>

            <div style="margin-top:20px">
                <button type="submit">Save</button>
                <button type="button" onclick="cancelEdit()">Cancel</button>
            </div>
        </form>
    `;
}
