---
title: "Super User Login"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<!-- Superuser Login -->
<fieldset id="loginFieldset" autocomplete="off">
  <legend>Superuser Login</legend>
  <label>Username:
    <input required type="text" id="adminUsername" name="adminUsername" autocomplete="username" />
  </label>
  <label>Password:
    <input required type="password" id="adminPassword" name="adminPassword" autocomplete="new-password" />
  </label>
  <button type="button" id="loginBtn">Login</button>
  <p id="loginStatus"></p>
</fieldset>

<!-- Admin Users Management (hidden until login) -->
<fieldset class="admin-user" style="display:none;">
  <legend>Admin User Details</legend>
  <label>Username: <input required class="name" type="text" /></label>
  <label>Email: <input class="short-input" type="email" /></label>
</fieldset>

<fieldset>
  <legend>Role</legend>
  <label><input required type="radio"> Full</label>
  <label><input required type="radio"> Limited</label>
</fieldset>

<button type="button" class="sendButton admin-user" id="saveUserBtn" style="display:none;">Add/Edit</button>
<button type="button" class="sendButton admin-user" id="cancelEditBtn" style="display:none;">Cancel</button>
<button type="button" class="sendButton admin-user" id="deleteUserBtn" style="display:none;">Delete</button>

<h2 class="admin-user" style="display:none;">Current Admin Users</h2>
<ul class="admin-user" id="adminUserList" style="display:none;"></ul>

<script type="module">
import { getFormRecord, populateForm, loadRecords } from '/js/adminForms.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form.verified-form");

  // Login
  const loginStatus = document.getElementById("loginStatus");
  const loginFieldset = document.getElementById("loginFieldset");
  const loginBtn = document.getElementById("loginBtn");
  loginBtn.addEventListener("click", async () => {
    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;
    if (!username || !password) {
      loginStatus.textContent = "Please enter username and password";
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/verifyAdmin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!data.success) {
        loginStatus.textContent = "Login failed: " + data.error;
        return;
      }

      window.ADMIN_SESSION_KEY = data.sessionKey;
      loginStatus.textContent = "Login successful. You can now manage admin users.";
      loginFieldset.style.display = "none";

      form.querySelectorAll(".admin-user").forEach(el => {
        el.style.display = (el.tagName === "BUTTON" || el.tagName === "H2" || el.tagName === "UL") ? "inline-block" : "block";
      });

      await loadUsers();
    } catch (err) {
      loginStatus.textContent = "Error during login: " + err.message;
    }
  });

  // API wrapper
  async function adminApiCall(action, username=null, role=null, metadata=null) {
    const body = { action };
    if (username) body.username = username;
    if (role) body.role = role;
    if (metadata) body.metadata = metadata;
    console.log("adminUsers Request body:", body);
    const res = await fetch("/.netlify/functions/adminUsers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": window.ADMIN_SESSION_KEY },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  // UI elements
  const list = document.getElementById("adminUserList");
  const saveBtn = document.getElementById("saveUserBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const deleteBtn = document.getElementById("deleteUserBtn");
  let editUsername = null;
  let usersCache = [];

  async function loadUsers() {
    const data = await adminApiCall("list");
    if (!data.success) return;
    usersCache = Object.entries(data.users).map(([username, user]) => ({
      username,
      email: user.metadata?.email || "",
      role: user.role
    }));
    loadRecords({
      records: usersCache,
      listEl: list,
      form,
      editBtnClass: "editUserBtn"
    });
  }

  // Edit button
  list.addEventListener("click", e => {
    if (!e.target.classList.contains("editUserBtn")) return;
    const idx = parseInt(e.target.dataset.index);
    const userRecord = usersCache[idx];
    if (!userRecord) return;
    editUsername = userRecord.username;
    populateForm(form, userRecord);
    cancelBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
  });

  // Save
  saveBtn.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const record = getFormRecord(form);
    const username = record.username;
    const role = record.role;
    const metadata = { email: record.email };
    const action = editUsername ? "edit" : "add";
    const apiUser = editUsername || username;
    const data = await adminApiCall(action, apiUser, role, metadata);
    if (data.success) {
      populateForm(form, {}); // clear form
      editUsername = null;
      cancelBtn.style.display = "none";
      deleteBtn.style.display = "none";
      await loadUsers();
    }
  });

  // Cancel
  cancelBtn.addEventListener("click", () => {
    populateForm(form, {});
    editUsername = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
  });

  // Delete
  deleteBtn.addEventListener("click", async () => {
    if (!editUsername) return;
    const data = await adminApiCall("delete", editUsername);
    if (data.success) {
      populateForm(form, {});
      editUsername = null;
      cancelBtn.style.display = "none";
      deleteBtn.style.display = "none";
      await loadUsers();
    }
  });
});
</script>
