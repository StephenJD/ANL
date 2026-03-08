// static/js/webeditor/editActions.js

export function setupEditActions(currentFileRef = { value: null }, rawBodyRef = { value: "" }) {

  async function saveEdit() {
    try {
      const form = document.getElementById("editForm");
      const data = new FormData(form);

      let front = "---\n";
      for (const [k, v] of data.entries()) {
        front += `${k}: ${v}\n`;
      }
      front += "---\n";
      const content = front + rawBodyRef.value;

      const res = await fetch("/.netlify/functions/save_edit", {
        method: "POST",
        body: JSON.stringify({ file: currentFileRef.value, content })
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      document.getElementById("tree").style.display = "block";
      document.getElementById("editButtons").style.display = "none";
    } catch (err) {
      console.error("saveEdit error:", err);
    }
  }

  async function publishEdits() {
    try {
      const res = await fetch("/.netlify/functions/publish_edits", { method: "POST" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      document.getElementById("tree").style.display = "block";
      document.getElementById("editButtons").style.display = "none";
    } catch (err) {
      console.error("publishEdits error:", err);
    }
  }

  function cancelEdit() {
    document.getElementById("editForm").innerHTML = "";
    document.getElementById("tree").style.display = "block";
    document.getElementById("editButtons").style.display = "none";
  }

  async function dropEdits() {
    try {
      if (!currentFileRef.value) return;

      const res = await fetch("/.netlify/functions/drop_edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: currentFileRef.value })
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      document.getElementById("tree").style.display = "block";
      document.getElementById("editForm").innerHTML = "";
      document.getElementById("editButtons").style.display = "none";
    } catch (err) {
      console.error("dropEdits error:", err);
    }
  }

  return { saveEdit, publishEdits, cancelEdit, dropEdits };
}
