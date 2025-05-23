using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.API.Middleware
{
    public class TokenBlacklistMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IServiceProvider _serviceProvider;

        public TokenBlacklistMiddleware(RequestDelegate next, IServiceProvider serviceProvider)
        {
            _next = next;
            _serviceProvider = serviceProvider;
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

                    // Extract token ID from JWT
                    var tokenHandler = new JwtSecurityTokenHandler();
                    var jwt = tokenHandler.ReadJwtToken(token);
                    var tokenId = jwt
                        .Claims.FirstOrDefault(x => x.Type == JwtRegisteredClaimNames.Jti)
                        ?.Value;

                    if (!string.IsNullOrEmpty(tokenId))
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var blacklistedTokenRepository =
                            scope.ServiceProvider.GetRequiredService<IBlacklistedTokenRepository>();

                        bool isBlacklisted =
                            await blacklistedTokenRepository.IsTokenBlacklistedAsync(tokenId);

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
