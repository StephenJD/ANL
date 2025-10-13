// checkToken.js
const { readStore } = require("./netlify/functions/tokenStore");

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

