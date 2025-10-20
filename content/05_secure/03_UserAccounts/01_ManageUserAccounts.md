---
title: "Manage User Accounts"
summary: "Manage User Accts"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<fieldset>
  <legend>Admin User Details</legend>
  <label>Username: <input required class="name" type="text" /></label>
  <label>Email: <input class="short-input" type="email" /></label>
</fieldset>

<fieldset>
  <legend>Role</legend>
  <label><input required type="radio" value="full" name="role"> Full</label>
  <label><input required type="radio" value="limited" name="role"> Limited</label>
</fieldset>

<button type="button" class="sendButton" id="saveUserBtn">Add/Edit</button>
<button type="button" class="sendButton" id="cancelEditBtn" style="display:none;">Cancel</button>
<button type="button" class="sendButton" id="deleteUserBtn" style="display:none;">Delete</button>

<h2>Current Admin Users</h2>
<ul id="adminUserList"></ul>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form.verified-form");
  const saveBtn = document.getElementById("saveUserBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const deleteBtn = document.getElementById("deleteUserBtn");
  const list = document.getElementById("adminUserList");
  let editUsername = null;
  const sessionKey = window.ADMIN_SESSION_KEY; // set after superuser login

  function urlize(str) {
    return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
  }

  function getFormRecord() {
    const record = {};
    form.querySelectorAll("label").forEach(label => {
      const key = urlize(label.childNodes[0].textContent.trim());
      const input = label.querySelector("input, select, textarea");
      if (!input) return;
      if (input.type === "radio") {
        if (input.checked) record[key] = input.value;
      } else record[key] = input.value.trim();
    });
    return record;
  }

  function populateForm(record) {
    form.querySelectorAll("input, select, textarea").forEach(input => {
      if (input.type === "radio" || input.type === "checkbox") input.checked = false;
      else input.value = "";
    });
    form.querySelectorAll("label").forEach(label => {
      const key = urlize(label.childNodes[0].textContent.trim());
      const input = label.querySelector("input, select, textarea");
      if (input && record[key] !== undefined) {
        if (input.type === "radio") input.checked = (input.value === record[key]);
        else input.value = record[key];
      }
    });
  }

  async function adminApiCall(action, username = null, role = null, metadata = null) {
    const body = { action };
    if (username) body.username = username;
    if (role) body.role = role;
    if (metadata) body.metadata = metadata;

    const res = await fetch("/.netlify/functions/adminUsers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": sessionKey
      },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async function loadUsers() {
    const data = await adminApiCall("list");
    list.innerHTML = "";
    if (!data.success) return;
    Object.keys(data.users).forEach(username => {
      const user = data.users[username];
      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.innerHTML = `
        <button type="button" class="editUserBtn editButton" data-username="${username}">Edit</button>
        <strong>${username}</strong> — Role: ${user.role}, Email: ${user.metadata?.email || "N/A"}
      `;
      list.appendChild(li);
    });
  }

  list.addEventListener("click", async e => {
    if (!e.target.classList.contains("editUserBtn")) return;
    const username = e.target.dataset.username;
    const data = await adminApiCall("list");
    const user = data.users[username];
    if (!user) return;
    editUsername = username;
    populateForm({ username, ...user });
    cancelBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
  });

  saveBtn.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const record = getFormRecord();
    const username = record.username;
    const role = record.role;
    const metadata = { email: record.email };

    const action = editUsername ? "edit" : "add";
    const apiUser = editUsername || username;
    const data = await adminApiCall(action, apiUser, role, metadata);
    if (data.success) {
      form.reset();
      editUsername = null;
      cancelBtn.style.display = "none";
      deleteBtn.style.display = "none";
      await loadUsers();
    }
  });

  cancelBtn.addEventListener("click", () => {
    form.reset();
    editUsername = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
  });

  deleteBtn.addEventListener("click", async () => {
    if (!editUsername) return;
    const data = await adminApiCall("delete", editUsername);
    if (data.success) {
      form.reset();
      editUsername = null;
      cancelBtn.style.display = "none";
      deleteBtn.style.display = "none";
      await loadUsers();
    }
  });

  loadUsers();
});
</script>
