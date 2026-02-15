// static/js/visitTracker.js

const token = localStorage.getItem("login_token");

if (!token && !sessionStorage.getItem("visit_logged")) {
  sessionStorage.setItem("visit_logged", "1");
  fetch("/.netlify/functions/trackVisit", { method: "POST" });
}
