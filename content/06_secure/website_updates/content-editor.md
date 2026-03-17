---
title: "Content Editor"
summary: "Edit page content."
type: document
function_key: content_editor
validation: [noSend]
access: [Content-Editor]
---

<!-- BEGIN CONTENT EDITOR UI -->
<h1>Content Editor</h1>

<div>
    <div id="editorContainer" style="display:block;">
    <div id="editorHeader" style="font-weight:bold;margin-bottom:8px;"></div>
    <form id="editForm">
      <!-- Core fields -->

      <label for="page_type">Page Type</label><br>
      <select id="page_type" name="page_type">
        <option value="Content">Content</option>
        <option value="Navigation">Navigation</option>
      </select><br>


      <label for="content_type">Content Type</label><br>
      <select id="content_type" name="content_type">
        <option value="Page from single file">Page from single file</option>
        <option value="Page from section files">Page from section files</option>
        <option value="Form">Form</option>
        <option value="Dynamic">Dynamic</option>
        <option value="Document">Document</option>
      </select><br>


      <label><input type="checkbox" id="give_content_prev_next_buttons" name="give_content_prev_next_buttons"> Give Content Prev/Next buttons</label><br>


      <label for="access">Access</label><br>
      <select id="access" name="access"></select><br>


      <label for="title">Title</label><br>
      <input type="text" id="title" name="title" class="webeditor-input webeditor-input--wide"><br>


      <label for="summary">Summary (for navigation pages)</label><br>
      <textarea id="summary" name="summary" rows="3" class="webeditor-input webeditor-input--wide"></textarea><br>

      <!-- Review fields -->

      <label for="expires">Expires</label><br>
      <input type="date" id="expires" name="expires"><br>


      <label for="last_reviewed">Last reviewed</label><br>
      <input type="date" id="last_reviewed" name="last_reviewed"><br>


      <label for="review_period">Review period</label><br>
      <input type="text" id="review_period" name="review_period"><br>


      <label for="reviewed_by">Reviewed by</label><br>
      <input type="text" id="reviewed_by" name="reviewed_by"><br>

      <!-- Form fields -->

      <label><input type="checkbox" id="include_unselected_options" name="include_unselected_options"> Include unselected options</label><br>


      <label for="validation">Validation</label><br>
      <select id="validation" name="validation">
        <option value="None">None</option>
        <option value="Request-Link">Request-Link</option>
        <option value="Submit">Submit</option>
      </select><br>

      <!-- Public fields -->

      <label><input type="checkbox" id="share" name="share"> Share</label><br>
      <label><input type="checkbox" id="qrCode" name="qrCode"> QR Code</label><br>

      <!-- Media fields -->

      <label for="background_image">Background image</label><br>
      <select id="background_image" name="background_image"></select><br>


      <label for="logo_image">Logo image</label><br>
      <select id="logo_image" name="logo_image"></select><br>
    </form>
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