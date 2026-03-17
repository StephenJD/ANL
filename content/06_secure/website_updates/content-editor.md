---
title: "Content Editor"
summary: "Edit page content."
type: document
function_key: content_editor
access: [Content-Editor]
---

<!-- BEGIN CONTENT EDITOR UI -->
<h1>Content Editor</h1>

<div>
  <div id="tree"></div>
  <div id="editorContainer" style="display:block;">
    <div id="editorHeader" style="font-weight:bold;margin-bottom:8px;"></div>
    <form id="editForm"></form>
    <label for="frontMatterText">Front Matter:</label>
    <textarea id="frontMatterText" style="width:100%;min-height:80px;height:auto;overflow:hidden;margin-bottom:10px;"></textarea>
    <div id="backgroundImageDropZone" style="border:1px dashed #888;padding:10px;border-radius:6px;cursor:pointer;user-select:none;margin-bottom:8px;">
      Drop background/logo image here or click to upload
    </div>
    <input id="backgroundImageFile" type="file" accept="image/*" style="display:none;" />

    <div id="bodyImageTools" style="margin-bottom:8px;">
      <label for="bodyImageSelect">Images in this folder:</label>
      <div id="bodyImageDrop" style="border:1px dashed #888;padding:10px;border-radius:6px;cursor:pointer;user-select:none;margin:6px 0 6px 0;">
        Drop image here or click to upload to this folder
      </div>
      <input id="bodyImageFile" type="file" accept="image/*" style="display:none;" />
      <select id="bodyImageSelect" style="display:block;width:100%;margin:4px 0 4px 0;">
        <option value="">Select an image...</option>
      </select>
      <div style="margin:4px 0;font-size:0.9em;">
        <label style="margin-right:12px;"><input type="radio" name="imageAction" value="paste" checked /> Paste at cursor</label>
        <label><input type="radio" name="imageAction" value="copy" /> Copy link</label>
      </div>
      <span id="bodyImageCopyFeedback" style="font-size:0.85em;color:green;display:none;margin-bottom:4px;">Link copied!</span>
      <img id="bodyImagePreview" src="" alt="" style="display:none;max-width:100%;max-height:180px;border:1px solid #ccc;border-radius:4px;margin-bottom:8px;" />
    </div>
    <div id="bodyTextWrap" style="display:none;">
      <label for="bodyText">Page Body:</label>
      <textarea id="bodyText" style="width:100%;min-height:220px;height:auto;margin-bottom:10px;"></textarea>
    </div>
    <div style="margin-top:10px;"></div>
  </div>
</div>
<div id="logDiv"></div>
<div id="editButtonsContainer"></div>
<script type="module" src="/js/webeditor/contentEditorMain.js"></script>
<!-- END CONTENT EDITOR UI -->