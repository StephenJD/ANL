// static/js/formatFormData.js
export function formatFormData(form) {
  const output = [];

  form.querySelectorAll('fieldset').forEach(fs => {
    const fieldsetLines = [];

    // Include legend
    const legend = fs.querySelector('legend')?.innerText.trim();
    if (legend) fieldsetLines.push(`<strong>${legend}</strong>`);

    // Process all labels in the fieldset
    fs.querySelectorAll('label').forEach(label => {
      const input = label.querySelector('input, textarea');
      if (!input) return;

      let line = label.textContent.trim();

      if (input.type === 'checkbox' || input.type === 'radio') {
        // Checked = normal text, unchecked = strikethrough
        line = input.checked ? line : `<s>${line}</s>`;
      } else if (['text', 'email', 'number', 'date'].includes(input.type) || input.tagName === 'TEXTAREA') {
        line += `: ${input.value || ''}`;
      }

      fieldsetLines.push(line);
    });

    if (fieldsetLines.length) {
      output.push(...fieldsetLines, '<br>'); // spacing between fieldsets
    }
  });

  return output.join('<br>');
}
