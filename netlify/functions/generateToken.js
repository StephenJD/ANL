// netlify/functions/generateToken.js

exports.handler = async (event) => {
  const { email } = JSON.parse(event.body || '{}');

  if (!email || !email.includes('@')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid email' }),
    };
  }

  // Generate a simple random token
  const token = Math.random().toString(36).substr(2, 12);

  // Here you would save it to a simple store, for demo we'll just return it
  // Later, you can store token-email pairs in a JSON file in functions
  return {
    statusCode: 200,
    body: JSON.stringify({ token }),
  };
};
