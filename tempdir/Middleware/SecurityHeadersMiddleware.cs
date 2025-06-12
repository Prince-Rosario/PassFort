namespace PassFort.API.Middleware
{
    /// <summary>
    /// Middleware to add security headers for PassFort Password Manager
    /// Addresses CSP, HSTS, COOP, and frame control security requirements
    /// </summary>
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IWebHostEnvironment _environment;

        public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
        {
            _next = next;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Content Security Policy (CSP) - Prevents XSS attacks
            var cspPolicy = BuildContentSecurityPolicy();
            context.Response.Headers["Content-Security-Policy"] = cspPolicy;

            // HTTP Strict Transport Security (HSTS) - Prevents downgrade attacks
            if (!_environment.IsDevelopment())
            {
                context.Response.Headers["Strict-Transport-Security"] = 
                    "max-age=31536000; includeSubDomains; preload";
            }

            // Cross-Origin-Opener-Policy (COOP) - Prevents cross-origin attacks
            context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";

            // Cross-Origin-Embedder-Policy (COEP) - Additional isolation
            context.Response.Headers["Cross-Origin-Embedder-Policy"] = "require-corp";

            // X-Frame-Options - Prevents clickjacking
            context.Response.Headers["X-Frame-Options"] = "DENY";

            // X-Content-Type-Options - Prevents MIME sniffing
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";

            // Referrer-Policy - Controls referrer information
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // X-XSS-Protection - Legacy XSS protection (for older browsers)
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";

            // Permissions-Policy - Controls browser features
            context.Response.Headers["Permissions-Policy"] = 
                "camera=(), microphone=(), geolocation=(), payment=()";

            await _next(context);
        }

        private string BuildContentSecurityPolicy()
        {
            var csp = new List<string>();

            if (_environment.IsDevelopment())
            {
                // Development CSP - More permissive for hot reload and debugging
                csp.Add("default-src 'self'");
                csp.Add("script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*");
                csp.Add("style-src 'self' 'unsafe-inline' http://localhost:*");
                csp.Add("connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*");
                csp.Add("img-src 'self' data: http://localhost:*");
                csp.Add("font-src 'self' data:");
                csp.Add("object-src 'none'");
                csp.Add("base-uri 'self'");
                csp.Add("form-action 'self'");
                csp.Add("frame-ancestors 'none'");
            }
            else
            {
                // Production CSP - Strict security for password manager
                csp.Add("default-src 'self'");
                csp.Add("script-src 'self'");
                csp.Add("style-src 'self' 'unsafe-inline'"); // Allow inline styles for UI frameworks
                csp.Add("connect-src 'self'");
                csp.Add("img-src 'self' data:");
                csp.Add("font-src 'self' data:");
                csp.Add("object-src 'none'");
                csp.Add("base-uri 'self'");
                csp.Add("form-action 'self'");
                csp.Add("frame-ancestors 'none'");
                csp.Add("upgrade-insecure-requests");
            }

            return string.Join("; ", csp);
        }
    }

    /// <summary>
    /// Extension method to register the security headers middleware
    /// </summary>
    public static class SecurityHeadersMiddlewareExtensions
    {
        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SecurityHeadersMiddleware>();
        }
    }
} 