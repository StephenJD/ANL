// formatFormData.js
export function formatFormEmail(form) {
  const output = [];

  form.querySelectorAll('fieldset').forEach(fs => {
    const fieldsetLines = [];

    // Include legend if present
    const legend = fs.querySelector('legend')?.innerText.trim();
    if (legend) fieldsetLines.push(legend);

    // Process inputs and textareas
    fs.querySelectorAll('input, textarea').forEach(el => {
      let line = '';

      // Radio
      if (el.type === 'radio' && el.checked) {
        const label = fs.querySelector(`label:has(input[name="${el.name}"]:checked)`);
        if (label) line = label.textContent.trim();
      }
      // Checkbox
      else if (el.type === 'checkbox' && el.checked) {
        const label = el.closest('label');
        if (label) line = label.textContent.trim();
      }
      // Text input / textarea
      else if (['text', 'email', 'number', 'date'].includes(el.type) || el.tagName === 'TEXTAREA') {
        if (el.value.trim()) {
          const label = fs.querySelector(`label[for="${el.id}"]`);
          const labelText = label ? label.textContent.trim() : el.name;
          line = `${labelText}: ${el.value.trim()}`;
        }
      }

      if (line) fieldsetLines.push(line);
    });

    if (fieldsetLines.length) {
      output.push(...fieldsetLines, ''); // add spacing only if fieldset has content
    }
  });

  // Remove trailing empty lines
  while (output.length && !output[output.length - 1].trim()) output.pop();

  return output.join('\n');
}

// Example usage:
// import { formatFormEmail } from './formatFormEmails.js';
// const form = document.querySelector('form.verified-form');
// const formattedEmail = formatFormEmail(form);
// console.log(formattedEmail);
