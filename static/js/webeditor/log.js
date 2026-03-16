// static/js/webeditor/log.js
// Defines window.log globally for all webeditor scripts
window.log = function(msg){
  const logDiv = document.getElementById("logDiv");
  if(logDiv){
    logDiv.textContent += msg + "\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log(msg);
};
