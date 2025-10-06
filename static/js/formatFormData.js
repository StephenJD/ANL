// static/js/formatFormData.js
export function formatFormData(form) {
  const output = [];

  form.querySelectorAll('fieldset').forEach(fs => {
    const fieldsetLines = [];

    // Include legend
    const legend = fs.querySelector('legend')?.innerText.trim();
    if (legend) fieldsetLines.push(`<strong>${legend}</strong>`);

    // Process all inputs and textareas
    fs.querySelectorAll('input, textarea').forEach(input => {
      let labelText = '';

      // Try to get label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest('label')) labelText = input.closest('label').textContent.trim();
      else labelText = input.name || '';

      let line = labelText;

      if (input.type === 'checkbox' || input.type === 'radio') {
        line = input.checked ? line : `<s>${line}</s>`;
      } else {
        line += `: ${input.value || ''}`;
      }

      fieldsetLines.push(line);
    });

    if (fieldsetLines.length) output.push(...fieldsetLines, '<br>');
  });

  return output.join('<br>');
}
