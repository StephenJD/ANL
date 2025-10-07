export function formatFormData(form) {
  const output = [];

  // Read from front matter (default false)
  const includeUnselected =
    (window.PAGE_FRONTMATTER &&
     window.PAGE_FRONTMATTER.include_unselected_options === true);

  form.querySelectorAll('fieldset').forEach(fs => {
    const fieldsetLines = [];

    // Include legend
    const legend = fs.querySelector('legend')?.innerText.trim();
    if (legend) fieldsetLines.push(`<strong>${legend}</strong>`);

    // Process inputs and textareas
    fs.querySelectorAll('input, textarea, select').forEach(input => {
      let labelText = '';

      // Try to get label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest('label')) labelText = input.closest('label').textContent.trim();
      else labelText = input.name || '';

      let line = '';

      if (input.type === 'checkbox' || input.type === 'radio') {
        if (includeUnselected || input.checked) {
          line = input.checked ? labelText : `<s>${labelText}</s>`;
          fieldsetLines.push(line);
        }
      } else {
        const value = input.value?.trim() || '';
        if (includeUnselected || value !== '') {
          line = `${labelText}: ${value}`;
          fieldsetLines.push(line);
        }
      }
    });

    if (fieldsetLines.length) output.push(...fieldsetLines, '<br>');
  });

  return output.join('<br>');
}
