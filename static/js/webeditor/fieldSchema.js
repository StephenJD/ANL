// static/js/webeditor/fieldSchema.js
export const fieldSchema = {
  fields: [
    { key: "page_type", label: "Page type", type: "select", options: ["Navigation", "Content", "Collated", "Section" ], required: true },
    { key: "access", label: "Access", type: "select", optionsProvider: "get_role_options", required: true  },
    { key: "type", label: "Type", type: "select", options: [ "Document", "Form", "Dynamic"] , required: true  },
    { key: "title", label: "Title", type: "text" },
    { key: "summary", label: "Summary (for navigation pages)", type: "textarea", rows: 3 },
    { key: "last_reviewed", label: "Last reviewed", type: "date" },
    { key: "review_period", label: "Review period", type: "text" },
    { key: "reviewed_by", label: "Reviewed by", type: "text" },

    { key: "include_unselected_options", label: "Include unselected options", type: "boolean", dependsOn: { key: "type", values: ["Form"] } },
    { key: "validation", label: "Validation", type: "select", options: ["None", "Request-Link", "Submit" ], default: "None", dependsOn: { key: "type", values: ["Form"] } },

    { key: "share", label: "Share", type: "boolean", dependsOn: { key: "access", values: ["public"] } },
    { key: "qrCode", label: "QR Code", type: "boolean", dependsOn: { key: "access", values: ["public"] } },
    { key: "background_image", label: "Background image", type: "text" },
    { key: "logo_image", label: "Logo image", type: "text" }
  ]
};
