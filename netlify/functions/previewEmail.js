// netlify/functions/previewEmail.js
const { formatFormData } = require('./formatFormData');

exports.handler = async (event) => {
  const formData = JSON.parse(event.body); // submission JSON
  const formatted = formatFormData(formData);

  console.log('Formatted email content:\n', formatted);

  return {
    statusCode: 200,
    body: 'Preview formatting checked'
  };
};
