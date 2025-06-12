# 🔐 PassFort Security Testing Guide

This guide provides comprehensive methods to test the security of your PassFort password manager application.

## 🚀 Quick Start

### 1. Automated Security Testing

Run the included security test script:

```bash
# Make sure your API is running on localhost:5000
cd PassFort.API
dotnet run

# In another terminal, run the security tests
./security-test.sh
```

### 2. Manual Header Testing

Test security headers manually:

```bash
# Test security headers
curl -I http://localhost:5000/api/health

# Should include:
# Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Cross-Origin-Opener-Policy: same-origin
```

## 🛠️ Security Testing Tools

### **Free Online Tools**

1. **Mozilla Observatory**
   ```bash
   # Test your deployed site
   curl -X POST "https://http-observatory.mozilla.org/api/v1/analyze?host=yourdomain.com"
   ```

2. **Security Headers Checker**
   - Visit: https://securityheaders.com/
   - Enter your domain for instant analysis

3. **SSL Labs Test**
   - Visit: https://www.ssllabs.com/ssltest/
   - Test HTTPS configuration

### **Professional Tools**

1. **OWASP ZAP** (Free)
   ```bash
   # Install ZAP
   brew install --cask owasp-zap  # macOS
   
   # Run automated scan
   zap-baseline.py -t http://localhost:3000
   ```

2. **Burp Suite** (Free/Paid)
   - Download: https://portswigger.net/burp
   - Configure proxy to intercept requests
   - Run active/passive scans

3. **Lighthouse Security Audit**
   ```bash
   # Install Lighthouse
   npm install -g lighthouse
   
   # Run security audit
   lighthouse http://localhost:3000 --only-categories=best-practices
   ```

## 🔍 Manual Security Tests

### **1. Authentication Security**

```bash
# Test protected endpoints without auth
curl -X GET http://localhost:5000/api/vault
# Should return 401 Unauthorized

# Test with invalid token
curl -X GET http://localhost:5000/api/vault \
  -H "Authorization: Bearer invalid_token"
# Should return 401 Unauthorized

# Test SQL injection in login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'\''OR 1=1--","masterPasswordHash":"test"}'
# Should return 400/422, not 200
```

### **2. CORS Testing**

```bash
# Test allowed origin
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:5000/api/auth/login \
     -I

# Test blocked origin
curl -H "Origin: http://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:5000/api/auth/login \
     -I
# Should NOT include Access-Control-Allow-Origin header
```

### **3. Input Validation**

```bash
# Test XSS in registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@test.com","masterPasswordHash":"test"}'

# Test oversized payload
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$(python3 -c "print('A' * 10000)")'","masterPasswordHash":"test"}'
```

### **4. Rate Limiting**

```bash
# Test login rate limiting
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","masterPasswordHash":"wrong"}' \
    -w "Response: %{http_code}\n" -o /dev/null -s
done
# Should eventually return 429 Too Many Requests
```

## 🔐 Zero-Knowledge Security Tests

### **1. Password Transmission**

```bash
# Monitor network traffic during login
# Ensure raw passwords are NEVER sent to server

# Use browser dev tools or proxy to verify:
# 1. Only masterPasswordHash is sent, not masterPassword
# 2. Hash is base64-encoded scrypt output
# 3. No plaintext passwords in any request
```

### **2. Encryption Key Management**

```javascript
// In browser console after login:
// Check that encryption key is not accessible
console.log(localStorage); // Should not contain encryption keys
console.log(sessionStorage); // Should not contain encryption keys

// Check SecureKeyManager
const keyManager = window.SecureKeyManager?.getInstance?.();
const key = keyManager?.getEncryptionKey?.();
console.log(key); // Should show CryptoKey object, not raw key data

// Try to export key (should fail)
crypto.subtle.exportKey('raw', key).catch(e => console.log('✅ Key not extractable:', e));
```

### **3. Vault Data Encryption**

```bash
# Check that vault data in database is encrypted
# Connect to your database and verify:
# 1. EncryptedData fields contain encrypted blobs
# 2. No plaintext passwords/usernames visible
# 3. Searchable fields are properly encrypted
```

## 📊 Security Checklist

### **Headers & Policies**
- [ ] Content-Security-Policy implemented
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security (production)
- [ ] Cross-Origin-Opener-Policy: same-origin
- [ ] Referrer-Policy configured

### **Authentication & Authorization**
- [ ] Protected endpoints require valid JWT
- [ ] Invalid tokens rejected
- [ ] Token expiration enforced
- [ ] Refresh token rotation
- [ ] Account lockout after failed attempts

### **Input Validation**
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] File upload restrictions
- [ ] Request size limits

### **Zero-Knowledge Architecture**
- [ ] Master passwords never sent to server
- [ ] Encryption keys never leave browser
- [ ] Vault data encrypted client-side
- [ ] Server cannot decrypt user data
- [ ] Keys cleared on logout

### **HTTPS & Transport**
- [ ] HTTPS enforced in production
- [ ] Strong TLS configuration
- [ ] Certificate validation
- [ ] HSTS headers
- [ ] Secure cookie flags

## 🚨 Security Incident Response

### **If Vulnerability Found**

1. **Document the issue**
   - Steps to reproduce
   - Impact assessment
   - Affected components

2. **Immediate actions**
   - Disable affected functionality if critical
   - Monitor for exploitation attempts
   - Notify stakeholders

3. **Fix and verify**
   - Implement fix
   - Test thoroughly
   - Re-run security tests
   - Deploy to production

4. **Post-incident**
   - Update security tests
   - Review security practices
   - Consider security audit

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Mozilla Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## 🔄 Regular Security Maintenance

### **Weekly**
- [ ] Run automated security tests
- [ ] Check for dependency vulnerabilities
- [ ] Review access logs

### **Monthly**
- [ ] Full security scan with professional tools
- [ ] Review and update security headers
- [ ] Test backup and recovery procedures

### **Quarterly**
- [ ] Professional penetration testing
- [ ] Security architecture review
- [ ] Update threat model
- [ ] Security training for team 