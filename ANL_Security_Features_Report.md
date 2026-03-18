# ANL Website Security Features Report

**Date:** March 18, 2026

---

## Authentication and Authorization
The ANL website uses a centralized authentication system for all serverless backend functions. Whenever a user tries to access protected resources or perform sensitive actions, their identity is checked using a secure token. This token is validated against a secure backend store and is specifically bound to the user’s device and browser, ensuring that even if someone manages to steal a token, it cannot be used from another device or browser. Role-based authorization is enforced, so every action a user attempts is checked against their assigned roles on the backend. This prevents users from spoofing their permissions or gaining unauthorized access by manipulating client-side code. Sessions expire after a certain period or if there is any mismatch in device or browser. Rate limiting is applied to login and verification endpoints to guard against brute-force attacks.

## Access Control
Access to content is tightly controlled. Each content file includes metadata (front matter) specifying its access level. Only content marked as public is published to the main website directory, making it accessible to everyone. Sensitive or private content is generated into a separate directory (`private_html`), which is never exposed to the public internet. Access to this private content is only possible through serverless functions, which always check the user’s authentication and roles before serving any data.

## Data Protection
Sensitive credentials, such as API keys and email passwords, are stored in a `.env` file that is excluded from both version control and deployment. No secrets or sensitive data are ever included in client-side JavaScript or static assets, reducing the risk of accidental exposure.

## Input Validation and Path Security
Strict input validation and path security measures are employed. Every serverless function that performs file operations first validates and sanitizes file paths, preventing attackers from using directory traversal techniques. All endpoints validate incoming data, rejecting malformed or unauthorized requests. This helps prevent a wide range of common web vulnerabilities, including injection attacks and unauthorized data access.

## Dependency and Build Security
Node.js dependencies are managed through a `package.json` file, allowing for regular security audits and ensuring only trusted packages are used. The build process ensures only intended files are published to the public web directory, while private files remain separate and protected.

## Email and Submission Security
Form submissions are protected using server-validated tokens, so only legitimate, authenticated submissions are accepted. Sensitive data is never included in URLs or client-side logs, preventing accidental data leaks through browser history or log files.

## Logging and Error Handling
Robust server-side logging records errors and suspicious activities, creating an audit trail for security monitoring and incident response.

## Additional Security Measures
Other features include in-memory caching for tokens with strict expiry rules, and public write access to secure data stores is disabled. Only server-side functions are allowed to write sensitive data, ensuring that even if an attacker gains access to the client side, they cannot modify or corrupt secure data.

---

**Summary**

The ANL website is built with a strong focus on security at every level. Authentication and authorization are enforced on the backend, access to content is tightly controlled, and sensitive data is carefully protected. Input validation, path security, and rate limiting further reduce the risk of attacks. All of these measures work together to ensure that users’ data and the website’s content remain safe from unauthorized access or tampering. No sensitive actions can be performed without proper backend verification, and private content is never exposed to the public, making the ANL website a secure platform for both users and administrators.
