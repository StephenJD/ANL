// static/js/webeditor/fieldSchema.js
export const fileTypeRules = {
  fileTypes: ["document", "form", "dynamic"]
};

export const fieldSchema = {
  derive: {
    page_type({ node }) {
      const qual = String(node?.qualification || "").toLowerCase();
      if (qual === "navigation:") return "Navigation";
      return "Content";
    },
    content_type({ node, frontMatter }) {
      const typeValue = String(frontMatter.type || "").toLowerCase();
      const parentQual = String(node?.parent?.qualification || "").toLowerCase();
      if (typeValue === "collated_page") return "Page from section files";
      if (typeValue === "document") {
        if (parentQual === "collated:") return "Document";
        if (parentQual === "navigation:") return "Page from single file";
      }
      if (typeValue === "form") return "Form";
      if (typeValue === "dynamic") return "Dynamic";
      return "";
    },
    give_content_prev_next_buttons({ frontMatter }) {
      const typeValue = String(frontMatter.type || "").toLowerCase();
      if (typeValue === "see_also") return "true";
      if (typeValue === "document-folder") return "false";
      return "";
    }
  },
  deriveType(values) {
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
  },
  fields: [
    { key: "page_type", label: "Page Type", type: "select", options: ["Content", "Navigation"], required: true, frontMatter: false },
    {
      key: "content_type",
      label: "Content Type",
      type: "select",
      options: ["Page from single file", "Page from section files", "Form", "Dynamic"],
      dependsOn: { key: "page_type", values: ["Content"] },
      required: true,
      frontMatter: false,
      normalizeValue(value) {
        const lower = String(value || "").toLowerCase();
        if (lower === "collated_page") return "page from section files";
        return value;
      },
      labelByParentQualification: {
        "collated:": "Section Type"
      },
      optionsByParentQualification: {
        "collated:": ["Document", "Form", "Dynamic"],
        "navigation:": ["Page from single file", "Page from section files", "Form", "Dynamic"]
      }
    },
    { key: "give_content_prev_next_buttons", label: "Give Content Prev/Next buttons", type: "boolean", dependsOn: { key: "page_type", values: ["Navigation"] } , required: true, frontMatter: false},
    { key: "access", label: "Access", type: "select", optionsProvider: "get_role_options", required: true },
    { key: "title", label: "Title", type: "text", required: true, width: "wide" },
    { key: "summary", label: "Summary (for navigation pages)", type: "textarea", rows: 3, width: "wide" },
    { key: "last_reviewed", label: "Last reviewed", type: "date" , dependsOn: { key: "page_type", values: ["Content"] } },
    { key: "review_period", label: "Review period", type: "text" , dependsOn: { key: "page_type", values: ["Content"] }},
    { key: "reviewed_by", label: "Reviewed by", type: "text" , dependsOn: { key: "page_type", values: ["Content"] }},
    { key: "include_unselected_options", label: "Include unselected options", type: "boolean", dependsOn: { key: "content_type", values: ["Form"] } },
    { key: "validation", label: "Validation", type: "select", options: ["None", "Request-Link", "Submit"], dependsOn: { key: "content_type", values: ["Form"] } },
    { key: "share", label: "Share", type: "boolean", dependsOnAll: [{ key: "access", values: ["public"] }, { key: "page_type", values: ["Content"] }] },
    { key: "qrCode", label: "QR Code", type: "boolean", dependsOnAll: [{ key: "access", values: ["public"] }, { key: "page_type", values: ["Content"] }] },
    { key: "background_image", label: "Background image", type: "select", optionsProvider: "get_shared_images", allowBlank: true, blankLabel: "None", caseSensitive: true, width: "wide",
      normalizeValue(value) {
        let v = String(value ?? "").trim();
        if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        v = v.replace(/\\\\/g, "/");
        if (v && !v.includes("/")) {
          v = `/images/shared/${v}`;
        }
        return v;
      }
    },
    { key: "logo_image", label: "Logo image", type: "select", optionsProvider: "get_shared_images", allowBlank: true, blankLabel: "None", caseSensitive: true, width: "wide",
      normalizeValue(value) {
        let v = String(value ?? "").trim();
        if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        v = v.replace(/\\\\/g, "/");
        if (v && !v.includes("/")) {
          v = `/images/shared/${v}`;
        }
        return v;
      }
    }
  ]
};
