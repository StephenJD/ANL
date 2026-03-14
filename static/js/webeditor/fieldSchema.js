// static/js/webeditor/fieldSchema.js

// ============================================================================
// Constants
// ============================================================================

export const CONTENT_TYPE_RULES = {
  fileTypes: ["document", "form", "dynamic"]
};

// Tree node colours by edit state (single point of maintenance)
// Priority: edited > staged > local > moved > default
export const TREE_NODE_STATE_COLORS = {
  edited: "red",      // saved locally, not yet staged
  staged: "orange",   // staged, ready to publish
  local: "green",     // published to home (local)
  moved: "red",       // moved (unsaved position change)
  default: "blue"     // clean / published to web
};

const PAGE_TYPE_OPTIONS = ["Content", "Navigation"];
const CONTENT_TYPE_OPTIONS = ["Page from single file", "Page from section files", "Form", "Dynamic"];
const CONTENT_TYPE_OPTIONS_BY_PARENT_QUALIFICATION = {
  "collated:": ["Document", "Form", "Dynamic"],
  "navigation:": ["Page from single file", "Page from section files", "Form", "Dynamic"]
};
const CONTENT_TYPE_LABEL_BY_PARENT_QUALIFICATION = {
  "collated:": "Section Type"
};
const VALIDATION_OPTIONS = ["None", "Request-Link", "Submit"];

const DEPENDS_ON_CONTENT_PAGE = { key: "page_type", values: ["Content"] };
const DEPENDS_ON_NAVIGATION_PAGE = { key: "page_type", values: ["Navigation"] };
const DEPENDS_ON_FORM_CONTENT = { key: "content_type", values: ["Form"] };
const DEPENDS_ON_PUBLIC_CONTENT = [
  { key: "access", values: ["public"] },
  { key: "page_type", values: ["Content"] }
];

// ============================================================================
// Helpers
// ============================================================================

function normalizeSharedImagePath(value) {
  let normalized = String(value ?? "").trim();
  if ((normalized.startsWith("\"") && normalized.endsWith("\"")) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  normalized = normalized.replace(/\\\\/g, "/");
  if (normalized && !normalized.includes("/")) {
    normalized = `/images/shared/${normalized}`;
  }
  return normalized;
}

function normalizeContentTypeValue(value) {
  const lower = String(value || "").toLowerCase();
  if (lower === "collated_page") return "page from section files";
  return value;
}

// ============================================================================
// Derived values
// ============================================================================

function derivePageType({ node }) {
  const qualification = String(node?.qualification || "").toLowerCase();
  if (qualification === "navigation:") return "Navigation";
  return "Content";
}

function deriveContentType({ node, frontMatter }) {
  const typeValue = String(frontMatter.type || "").toLowerCase();
  const parentQualification = String(node?.parent?.qualification || "").toLowerCase();

  if (typeValue === "collated_page") return "Page from section files";
  if (typeValue.startsWith("document")) {
    if (parentQualification === "collated:") return "Document";
    if (parentQualification === "navigation:") return "Page from single file";
  }
  if (typeValue.startsWith("form")) return "Form";
  if (typeValue.startsWith("dynamic")) return "Dynamic";
  return "";
}

function derivePrevNextButtons({ frontMatter }) {
  const typeValue = String(frontMatter.type || "").toLowerCase();
  if (typeValue === "see_also") return "true";
  if (typeValue === "document-folder") return "false";
  return "";
}

function deriveFrontMatterType(values) {
  const pageType = String(values.page_type || "").toLowerCase();
  const contentType = String(values.content_type || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const givePrevNext = String(values.give_content_prev_next_buttons || "").toLowerCase() === "true";

  if (pageType === "navigation") {
    return givePrevNext ? "see_also" : "document-folder";
  }
  if (pageType === "content" || pageType === "") {
    if (contentType === "page from section files") return "collated_page";
    if (contentType === "page from single file") return "document";
    if (contentType === "document") return "document";
    if (contentType === "form") return "form";
    if (contentType === "dynamic") return "dynamic";
  }
  return "";
}

// ============================================================================
// Field definitions
// ============================================================================

const CORE_FIELDS = [
  { key: "page_type", label: "Page Type", type: "select", options: PAGE_TYPE_OPTIONS, required: true, frontMatter: false },
  {
    key: "content_type",
    label: "Content Type",
    type: "select",
    options: CONTENT_TYPE_OPTIONS,
    dependsOn: DEPENDS_ON_CONTENT_PAGE,
    required: true,
    frontMatter: false,
    normalizeValue: normalizeContentTypeValue,
    labelByParentQualification: CONTENT_TYPE_LABEL_BY_PARENT_QUALIFICATION,
    optionsByParentQualification: CONTENT_TYPE_OPTIONS_BY_PARENT_QUALIFICATION
  },
  {
    key: "give_content_prev_next_buttons",
    label: "Give Content Prev/Next buttons",
    type: "boolean",
    dependsOn: DEPENDS_ON_NAVIGATION_PAGE,
    required: true,
    frontMatter: false
  },
  { key: "access", label: "Access", type: "select", optionsProvider: "get_role_options", required: true },
  { key: "title", label: "Title", type: "text", required: true, width: "wide" },
  { key: "summary", label: "Summary (for navigation pages)", type: "textarea", rows: 3, width: "wide" }
];

const REVIEW_FIELDS = [
  { key: "last_reviewed", label: "Last reviewed", type: "date", dependsOn: DEPENDS_ON_CONTENT_PAGE },
  { key: "expires", label: "Expires", type: "date", dependsOn: DEPENDS_ON_CONTENT_PAGE },
  { key: "review_period", label: "Review period", type: "text", dependsOn: DEPENDS_ON_CONTENT_PAGE },
  { key: "reviewed_by", label: "Reviewed by", type: "text", dependsOn: DEPENDS_ON_CONTENT_PAGE }
];

const FORM_FIELDS = [
  { key: "include_unselected_options", label: "Include unselected options", type: "boolean", dependsOn: DEPENDS_ON_FORM_CONTENT },
  { key: "validation", label: "Validation", type: "select", options: VALIDATION_OPTIONS, dependsOn: DEPENDS_ON_FORM_CONTENT }
];

const PUBLIC_FIELDS = [
  { key: "share", label: "Share", type: "boolean", dependsOnAll: DEPENDS_ON_PUBLIC_CONTENT },
  { key: "qrCode", label: "QR Code", type: "boolean", dependsOnAll: DEPENDS_ON_PUBLIC_CONTENT }
];

const MEDIA_FIELDS = [
  {
    key: "background_image",
    label: "Background image",
    type: "select",
    optionsProvider: "get_shared_images",
    allowBlank: true,
    blankLabel: "None",
    caseSensitive: true,
    width: "wide",
    normalizeValue: normalizeSharedImagePath
  },
  {
    key: "logo_image",
    label: "Logo image",
    type: "select",
    optionsProvider: "get_shared_images",
    allowBlank: true,
    blankLabel: "None",
    caseSensitive: true,
    width: "wide",
    normalizeValue: normalizeSharedImagePath
  }
];

const fieldDefinitions = [
  ...CORE_FIELDS,
  ...REVIEW_FIELDS,
  ...FORM_FIELDS,
  ...PUBLIC_FIELDS,
  ...MEDIA_FIELDS
];

export const WEBEDITOR_FIELD_SCHEMA = {
  deriveDisplayValues: {
    page_type: derivePageType,
    content_type: deriveContentType,
    give_content_prev_next_buttons: derivePrevNextButtons
  },
  deriveFrontMatterType,
  fieldDefinitions
};

// ============================================================================
// Backward-compatible exports
// ============================================================================

export const fileTypeRules = CONTENT_TYPE_RULES;
export const editStateColors = TREE_NODE_STATE_COLORS;

export const fieldSchema = {
  derive: WEBEDITOR_FIELD_SCHEMA.deriveDisplayValues,
  deriveType: WEBEDITOR_FIELD_SCHEMA.deriveFrontMatterType,
  fields: WEBEDITOR_FIELD_SCHEMA.fieldDefinitions
};
