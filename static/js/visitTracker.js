// static/js/visitTracker.js
import { netlifyFetch } from "/js/netlifyAuthFetch.js";

const token = localStorage.getItem("userLogin_token");
const isLoggedIn =
  !!token &&
  token !== "null" &&
  token !== "undefined" &&
  token.trim() !== "";

if (!isLoggedIn && !sessionStorage.getItem("visit_logged")) {
  sessionStorage.setItem("visit_logged", "1");
  netlifyFetch("/.netlify/functions/trackVisit", { method: "POST" });
}
