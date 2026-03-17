// static/js/webeditor/imageDropZone.js
// Helper for rendering shared image dropzone and file input

export function renderImageDropZone(form, onUpload) {
  console.log('[renderImageDropZone] called for form:', form);
  const uploadRow = document.createElement("div");
  uploadRow.className = "webeditor-upload-row";
  const dropZone = document.createElement("div");
  dropZone.className = "webeditor-dropzone";
  dropZone.textContent = "Drop image here or click to browse";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "webeditor-file-input";
  dropZone.addEventListener("click", () => {
    console.log('[renderImageDropZone] dropZone clicked');
    fileInput.click();
  });
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("webeditor-dropzone--active");
    console.log('[renderImageDropZone] dragover');
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("webeditor-dropzone--active");
    console.log('[renderImageDropZone] dragleave');
  });
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("webeditor-dropzone--active");
    const file = e.dataTransfer?.files?.[0];
    console.log('[renderImageDropZone] drop event, file:', file);
    if (file) onUpload(file, dropZone, fileInput);
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    console.log('[renderImageDropZone] fileInput change, file:', file);
    if (file) onUpload(file, dropZone, fileInput);
  });
  uploadRow.appendChild(dropZone);
  uploadRow.appendChild(fileInput);
  form.appendChild(uploadRow);
  console.log('[renderImageDropZone] dropZone and fileInput appended to form:', form);
}
