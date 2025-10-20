---
title: "Permitted Users"
summary: "Super User Login"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<!-- Superuser Login -->
<fieldset id="loginFieldset" autocomplete="off">
  <legend>Superuser Login</legend>
  <label>Super-UserEmail:<input required type="email" autocomplete="username" /></label>
  <label>Password:<input required type="password" autocomplete="new-password" /></label>
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

let FORM_TITLE = "Permitted Users";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form.verified-form");
  
  // Login
  const loginBtn = document.getElementById("loginBtn");
  loginBtn.addEventListener("click", async () => {
    const usernameInput = Array.from(loginFieldset.querySelectorAll("label"))
      .find(l => l.textContent.includes("Super-UserEmail"))?.querySelector("input");
    const passwordInput = Array.from(loginFieldset.querySelectorAll("label"))
      .find(l => l.textContent.includes("Password"))?.querySelector("input");

    const username = usernameInput?.value.trim() || "";
    const password = passwordInput?.value || "";
    
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
      usernameInput.removeAttribute('required');
      passwordInput.removeAttribute('required');

      form.querySelectorAll(".admin-user").forEach(el => {
        el.style.display = (el.tagName === "BUTTON" || el.tagName === "H2" || el.tagName === "UL") ? "inline-block" : "block";
      });

      await loadUsers();
    } catch (err) {
      loginStatus.textContent = "Error during login: " + err.message;
    }
  });

  // API wrapper
  async function adminApiCall(action, username=null, role=null, email=null) {
    const body = { action, formTitle: FORM_TITLE };
    if (username) body.username = username;
    if (role) body.role = role;
    if (email) body.email = email;

    console.log("adminUsers Request body:", body);
    const res = await fetch("/.netlify/functions/adminUsers", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-admin-token": window.ADMIN_SESSION_KEY
      },
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

  // usersArray is already the array of users
  usersCache = data.users.map(user => ({
    username: user.username,
    email: user.email || "",
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
    const email = record.email;
    const action = editUsername ? "edit" : "add";
    const apiUser = editUsername || username;
    const data = await adminApiCall(action, apiUser, role, email);
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
