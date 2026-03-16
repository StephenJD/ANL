// static/js/webeditor/imageDropZone.js
// Helper for rendering shared image dropzone and file input

export function renderImageDropZone(form, onUpload) {
  const uploadRow = document.createElement("div");
  uploadRow.className = "webeditor-upload-row";
  const dropZone = document.createElement("div");
  dropZone.className = "webeditor-dropzone";
  dropZone.textContent = "Drop image here or click to browse";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "webeditor-file-input";
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("webeditor-dropzone--active");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("webeditor-dropzone--active");
  });
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("webeditor-dropzone--active");
    const file = e.dataTransfer?.files?.[0];
    if (file) onUpload(file, dropZone, fileInput);
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) onUpload(file, dropZone, fileInput);
  });
  uploadRow.appendChild(dropZone);
  uploadRow.appendChild(fileInput);
  form.appendChild(uploadRow);
}
