// checkToken.js
// node .\checkToken.js <optional token>
const { readStore } = require("./netlify/functions/secureStore");

(async () => {
  const tokenArg = process.argv[2];
  const store = await readStore();

  if (tokenArg) {
    const entry = store[tokenArg];
    if (!entry) {
      console.log(`Token not found: ${tokenArg}`);
    } else {
      console.log(`Token: ${tokenArg}\n`, entry);
    }
  } else {
    console.log("All stored tokens:\n", store);
  }
})();

