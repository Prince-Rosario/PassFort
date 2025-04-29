using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using PassFort.Api.Services;

namespace PassFort.Api.Middleware
{
    public class TokenBlacklistMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly TokenBlacklistService _tokenBlacklistService;

        public TokenBlacklistMiddleware(
            RequestDelegate next,
            TokenBlacklistService tokenBlacklistService
        )
        {
            _next = next;
            _tokenBlacklistService = tokenBlacklistService;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (
                context.Request.Headers.TryGetValue(
                    "Authorization",
                    out StringValues authorizationHeader
                )
            )
            {
                string authHeader = authorizationHeader.ToString();
                if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    string token = authHeader.Substring("Bearer ".Length).Trim();
                    bool isBlacklisted = await _tokenBlacklistService.IsTokenBlacklisted(token);

                    if (isBlacklisted)
                    {
                        context.Response.Clear();
                        context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                        context.Response.ContentType = "application/json";

                        var response = new
                        {
                            success = false,
                            message = "Token has been revoked. Please log in again.",
                        };

                        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
                        return;
                    }
                }
            }

            await _next(context);
        }
    }

    // Extension method for registering the middleware
    public static class TokenBlacklistMiddlewareExtensions
    {
        public static IApplicationBuilder UseTokenBlacklist(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<TokenBlacklistMiddleware>();
        }
    }
}
