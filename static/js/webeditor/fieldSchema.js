// static/js/webeditor/fieldSchema.js
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
  fields: [
    { key: "page_type", label: "Page Type", type: "select", options: ["Content", "Navigation"], required: true },
    {
      key: "content_type",
      label: "Content Type",
      type: "select",
      options: ["Page from single file", "Page from section files", "Form", "Dynamic"],
      dependsOn: { key: "page_type", values: ["Content"] },
      required: true,
      optionsByParentQualification: {
        "collated:": ["Document", "Form", "Dynamic"],
        "navigation:": ["Page from single file", "Page from section files", "Form", "Dynamic"]
      }
    },
    { key: "give_content_prev_next_buttons", label: "Give Content Prev/Next buttons", type: "boolean", dependsOn: { key: "page_type", values: ["Navigation"] } , required: true},
    { key: "access", label: "Access", type: "select", optionsProvider: "get_role_options", required: true },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "summary", label: "Summary (for navigation pages)", type: "textarea", rows: 3 },
    { key: "last_reviewed", label: "Last reviewed", type: "date" , dependsOn: { key: "page_type", values: ["Content"] } },
    { key: "review_period", label: "Review period", type: "text" , dependsOn: { key: "page_type", values: ["Content"] }},
    { key: "reviewed_by", label: "Reviewed by", type: "text" , dependsOn: { key: "page_type", values: ["Content"] }},
    { key: "include_unselected_options", label: "Include unselected options", type: "boolean", dependsOn: { key: "content_type", values: ["Form"] } },
    { key: "validation", label: "Validation", type: "select", options: ["None", "Request-Link", "Submit"], dependsOn: { key: "content_type", values: ["Form"] } },
    { key: "share", label: "Share", type: "boolean", dependsOnAll: [{ key: "access", values: ["public"] }, { key: "page_type", values: ["Content"] }] },
    { key: "qrCode", label: "QR Code", type: "boolean", dependsOnAll: [{ key: "access", values: ["public"] }, { key: "page_type", values: ["Content"] }] },
    { key: "background_image", label: "Background image", type: "text" },
    { key: "logo_image", label: "Logo image", type: "text" }
  ]
};
