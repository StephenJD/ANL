// netlify/functions/dynamic_generators/generate_content_editor.js
export default async function generate_content_editor() {

  // Assign the HTML to a variable and return it as a string
  const html = `
<h1>Content Editor</h1>

<div>
  <div id="tree"></div>
  <div id="editorContainer" style="display:block;">
    <div id="editorHeader" style="font-weight:bold;margin-bottom:8px;"></div>
    <form id="editForm"></form>
    <label for="frontMatterText">Front Matter:</label>
    <textarea id="frontMatterText" style="width:100%;min-height:80px;height:auto;overflow:hidden;margin-bottom:10px;"></textarea>
    <div id="bodyTextWrap" style="display:none;">
      <div id="bodyImageTools" style="margin-bottom:8px;">
        <label for="bodyImageSelect">Images in this folder:</label>
        <select id="bodyImageSelect" style="display:block;width:100%;margin:4px 0 4px 0;">
          <option value="">Select an image...</option>
        </select>
        <div style="margin:4px 0;font-size:0.9em;">
          <label style="margin-right:12px;"><input type="radio" name="imageAction" value="paste" checked /> Paste at cursor</label>
          <label><input type="radio" name="imageAction" value="copy" /> Copy link</label>
        </div>
        <span id="bodyImageCopyFeedback" style="font-size:0.85em;color:green;display:none;margin-bottom:4px;">Link copied!</span>
        <img id="bodyImagePreview" src="" alt="" style="display:none;max-width:100%;max-height:180px;border:1px solid #ccc;border-radius:4px;margin-bottom:8px;" />
        <div id="bodyImageDrop" style="border:1px dashed #888;padding:10px;border-radius:6px;cursor:pointer;user-select:none;">
          Drop image here or click to upload to this folder
        </div>
        <input id="bodyImageFile" type="file" accept="image/*" style="display:none;" />
      </div>
      <label for="bodyText">Page Body:</label>
      <textarea id="bodyText" style="width:100%;min-height:220px;height:auto;overflow:auto;margin-bottom:10px;"></textarea>
    </div>
    <div style="margin-top:10px;"></div>
  </div>
</div>
<div id="logDiv"></div>
<div id="treeEditButtons"></div>
<script type="module" src="/js/webeditor/contentEditorMain.js"></script>
`;
  return html;
}
