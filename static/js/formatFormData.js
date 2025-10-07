// static/js/formatFormData.js
export function formatFormData(form, options = {}) {
  const includeUnselected = options.includeUnselected ??
    (window.PAGE_FRONTMATTER?.include_unselected_options || false);

  const output = [];

  form.querySelectorAll('fieldset').forEach(fs => {
    const fieldsetLines = [];

    const legend = fs.querySelector('legend')?.innerText.trim();
    if (legend) fieldsetLines.push(`<strong>${legend}</strong>`);

    fs.querySelectorAll('input, textarea').forEach(input => {
      let labelText = '';
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest('label')) labelText = input.closest('label').textContent.trim();
      else labelText = input.name || '';

      let line = labelText;

      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked) {
          line = line;
        } else if (includeUnselected) {
          line = `<s>${line}</s>`;
        } else {
          return; // skip unselected if flag is false
        }
      } else {
        line += `: ${input.value || ''}`;
      }

      fieldsetLines.push(line);
    });

    if (fieldsetLines.length) output.push(...fieldsetLines, '<br>');
  });

  return output.join('<br>');
}
