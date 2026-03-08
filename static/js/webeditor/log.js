// \static\js\webeditor\log.js
window.log = function(msg) {
    const logDiv = document.getElementById("logDiv");
    if(logDiv) {
        logDiv.textContent += msg + "\n";
        logDiv.scrollTop = logDiv.scrollHeight;
    }
    console.log(msg);
}
