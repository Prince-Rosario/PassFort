#!/bin/bash

# PassFort Security Testing Script
# Tests various security aspects of the password manager application

echo "🔐 PassFort Security Testing Suite"
echo "=================================="

# Configuration
API_URL="http://localhost:5123"
FRONTEND_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    echo -e "\n${BLUE}Checking $name...${NC}"
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is not running at $url${NC}"
        return 1
    fi
}

# Function to test security headers
test_security_headers() {
    echo -e "\n${BLUE}🛡️  Testing Security Headers...${NC}"
    
    local headers=(
        "Content-Security-Policy"
        "Strict-Transport-Security"
        "X-Frame-Options"
        "X-Content-Type-Options"
        "Cross-Origin-Opener-Policy"
        "Cross-Origin-Embedder-Policy"
        "Referrer-Policy"
        "X-XSS-Protection"
        "Permissions-Policy"
    )
    
    for header in "${headers[@]}"; do
        local result=$(curl -s -I "$API_URL/api/health" 2>/dev/null | grep -i "$header" || echo "")
        if [ -n "$result" ]; then
            echo -e "${GREEN}✅ $header: ${result#*: }${NC}"
        else
            echo -e "${RED}❌ Missing: $header${NC}"
        fi
    done
}

# Function to test CORS configuration
test_cors() {
    echo -e "\n${BLUE}🌐 Testing CORS Configuration...${NC}"
    
    # Test allowed origin
    local cors_result=$(curl -s -H "Origin: http://localhost:3000" \
                           -H "Access-Control-Request-Method: POST" \
                           -H "Access-Control-Request-Headers: Content-Type" \
                           -X OPTIONS "$API_URL/api/auth/login" \
                           -I 2>/dev/null | grep -i "access-control")
    
    if [ -n "$cors_result" ]; then
        echo -e "${GREEN}✅ CORS headers present${NC}"
        echo "$cors_result"
    else
        echo -e "${RED}❌ CORS headers missing${NC}"
    fi
    
    # Test disallowed origin
    local bad_cors=$(curl -s -H "Origin: http://malicious-site.com" \
                        -H "Access-Control-Request-Method: POST" \
                        -X OPTIONS "$API_URL/api/auth/login" \
                        -I 2>/dev/null | grep -i "access-control-allow-origin")
    
    if [ -z "$bad_cors" ]; then
        echo -e "${GREEN}✅ Malicious origins blocked${NC}"
    else
        echo -e "${RED}❌ Malicious origins allowed: $bad_cors${NC}"
    fi
}

# Function to test authentication endpoints
test_auth_security() {
    echo -e "\n${BLUE}🔑 Testing Authentication Security...${NC}"
    
    # Test unauthenticated access to protected endpoint
    local auth_test=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/vault")
    
    if [ "$auth_test" = "401" ]; then
        echo -e "${GREEN}✅ Protected endpoints require authentication${NC}"
    else
        echo -e "${RED}❌ Protected endpoints accessible without auth (HTTP $auth_test)${NC}"
    fi
    
    # Test invalid token
    local invalid_token_test=$(curl -s -o /dev/null -w "%{http_code}" \
                              -H "Authorization: Bearer invalid_token" \
                              "$API_URL/api/vault")
    
    if [ "$invalid_token_test" = "401" ]; then
        echo -e "${GREEN}✅ Invalid tokens rejected${NC}"
    else
        echo -e "${RED}❌ Invalid tokens accepted (HTTP $invalid_token_test)${NC}"
    fi
}

# Function to test rate limiting (if implemented)
test_rate_limiting() {
    echo -e "\n${BLUE}⏱️  Testing Rate Limiting...${NC}"
    
    local rate_limit_count=0
    for i in {1..10}; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
                        -X POST "$API_URL/api/auth/login" \
                        -H "Content-Type: application/json" \
                        -d '{"email":"test@test.com","masterPasswordHash":"invalid"}')
        
        if [ "$response" = "429" ]; then
            rate_limit_count=$((rate_limit_count + 1))
        fi
    done
    
    if [ $rate_limit_count -gt 0 ]; then
        echo -e "${GREEN}✅ Rate limiting active (triggered $rate_limit_count times)${NC}"
    else
        echo -e "${YELLOW}⚠️  Rate limiting not detected${NC}"
    fi
}

# Function to test HTTPS redirect
test_https_redirect() {
    echo -e "\n${BLUE}🔒 Testing HTTPS Configuration...${NC}"
    
    # This would test HTTPS redirect in production
    echo -e "${YELLOW}ℹ️  HTTPS testing requires production deployment${NC}"
    echo -e "${YELLOW}ℹ️  Manually test: curl -I http://yourdomain.com${NC}"
}

# Function to test input validation
test_input_validation() {
    echo -e "\n${BLUE}🛡️  Testing Input Validation...${NC}"
    
    # Test SQL injection attempt
    local sql_injection=$(curl -s -o /dev/null -w "%{http_code}" \
                         -X POST "$API_URL/api/auth/login" \
                         -H "Content-Type: application/json" \
                         -d '{"email":"admin'\''OR 1=1--","masterPasswordHash":"test"}')
    
    if [ "$sql_injection" = "400" ] || [ "$sql_injection" = "422" ]; then
        echo -e "${GREEN}✅ SQL injection attempts blocked${NC}"
    else
        echo -e "${RED}❌ SQL injection not properly handled (HTTP $sql_injection)${NC}"
    fi
    
    # Test XSS attempt
    local xss_test=$(curl -s -o /dev/null -w "%{http_code}" \
                    -X POST "$API_URL/api/auth/register" \
                    -H "Content-Type: application/json" \
                    -d '{"email":"<script>alert(1)</script>@test.com","masterPasswordHash":"test"}')
    
    if [ "$xss_test" = "400" ] || [ "$xss_test" = "422" ]; then
        echo -e "${GREEN}✅ XSS attempts blocked${NC}"
    else
        echo -e "${RED}❌ XSS not properly handled (HTTP $xss_test)${NC}"
    fi
}

# Function to check for sensitive data exposure
test_sensitive_data() {
    echo -e "\n${BLUE}🔍 Testing for Sensitive Data Exposure...${NC}"
    
    # Check if error messages expose sensitive info
    local error_response=$(curl -s "$API_URL/api/auth/login" \
                          -X POST \
                          -H "Content-Type: application/json" \
                          -d '{"email":"nonexistent@test.com","masterPasswordHash":"wrong"}')
    
    if echo "$error_response" | grep -qi "password\|hash\|database\|sql\|exception"; then
        echo -e "${RED}❌ Error messages may expose sensitive information${NC}"
        echo "Response: $error_response"
    else
        echo -e "${GREEN}✅ Error messages don't expose sensitive data${NC}"
    fi
}

# Function to generate security report
generate_report() {
    echo -e "\n${BLUE}📊 Security Test Summary${NC}"
    echo "========================"
    echo "Timestamp: $(date)"
    echo "API URL: $API_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
    echo "Manual testing recommendations:"
    echo "1. Run OWASP ZAP scan: https://www.zaproxy.org/"
    echo "2. Test with Burp Suite: https://portswigger.net/burp"
    echo "3. Use Mozilla Observatory: https://observatory.mozilla.org/"
    echo "4. Check SSL Labs: https://www.ssllabs.com/ssltest/"
    echo "5. Perform penetration testing"
}

# Main execution
main() {
    echo "Starting security tests..."
    
    # Check if services are running
    if check_service "$API_URL" "API Server"; then
        test_security_headers
        test_cors
        test_auth_security
        test_rate_limiting
        test_input_validation
        test_sensitive_data
    fi
    
    test_https_redirect
    generate_report
    
    echo -e "\n${GREEN}🔐 Security testing completed!${NC}"
}

# Run the tests
main 