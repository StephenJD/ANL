// static/js/visitTracker.js

const token = localStorage.getItem("userLogin_token");
const isLoggedIn =
  !!token &&
  token !== "null" &&
  token !== "undefined" &&
  token.trim() !== "";

if (!isLoggedIn && !sessionStorage.getItem("visit_logged")) {
  sessionStorage.setItem("visit_logged", "1");
  fetch("/.netlify/functions/trackVisit", { method: "POST" });
}
