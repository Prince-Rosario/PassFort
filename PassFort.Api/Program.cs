using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PassFort.API.Middleware;
using PassFort.BLL.Services;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure PostgreSQL Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Configure Identity
builder
    .Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        // Password settings
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredLength = 8;

        // Lockout settings
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;

        // User settings
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Configure JWT Authentication
var jwtSection = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSection);

var appSettings = jwtSection.Get<JwtSettings>();
if (appSettings != null)
{
    var key = Encoding.ASCII.GetBytes(appSettings.SecretKey);

    builder
        .Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.SaveToken = true;
            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment(); // Require HTTPS in production
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = appSettings.Issuer,
                ValidAudience = appSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero,
            };
        });
}
else
{
    throw new InvalidOperationException("JwtSettings configuration is missing or invalid.");
}

// Register Repository Layer (DAL)
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<IBlacklistedTokenRepository, BlacklistedTokenRepository>();
builder.Services.AddScoped<IUserRecoveryCodeRepository, UserRecoveryCodeRepository>();
builder.Services.AddScoped<IVaultRepository, VaultRepository>();
builder.Services.AddScoped<IVaultItemRepository, VaultItemRepository>();
builder.Services.AddScoped<IVaultFolderRepository, VaultFolderRepository>();

// Register Business Logic Layer (BLL)
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IMfaService, MfaService>();
builder.Services.AddScoped<IVaultService, VaultService>();

// CORS Configuration - Secure for password manager
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowSpecificOrigins",
        corsBuilder =>
        {
            if (builder.Environment.IsDevelopment())
            {
                // Development - Allow localhost and ngrok origins
                corsBuilder
                    .WithOrigins(
                        // Local development
                        "http://localhost:3000", // React frontend
                        "http://localhost:8080",
                        "http://127.0.0.1:8080",
                        "http://127.0.0.1:3000",
                        "https://localhost:3000", // HTTPS local
                        "https://127.0.0.1:3000",
                        
                        // ngrok tunnels
                        "https://2b53-164-92-155-6.ngrok-free.app", // Your current ngrok URL
                        
                        // Network testing
                        "http://10.210.79.74:3000", // Mac IP for mobile testing
                        "http://10.33.0.2:3000"     // Alternative Mac IP for mobile testing
                    )
                    .SetIsOriginAllowed(origin =>
                    {
                        // Allow any ngrok domain in development
                        if (string.IsNullOrEmpty(origin)) return false;
                        
                        var uri = new Uri(origin);
                        return uri.Host.EndsWith(".ngrok.io") || 
                               uri.Host.EndsWith(".ngrok-free.app") || 
                               uri.Host.EndsWith(".ngrok.app") ||
                               uri.Host.EndsWith(".ngrok.dev") ||
                               uri.Host == "localhost" ||
                               uri.Host == "127.0.0.1" ||
                               uri.Host.StartsWith("10.") ||
                               uri.Host.StartsWith("192.168.");
                    })
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            }
            else
            {
                // Production - Restrict to specific domains
                corsBuilder
                    .WithOrigins(
                        "https://passfort.com",
                        "https://www.passfort.com",
                        "https://app.passfort.com"
                        // Add your production domains here
                    )
                    .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .WithHeaders("Content-Type", "Authorization", "X-Requested-With")
                    .AllowCredentials()
                    .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
            }
        }
    );
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Add security headers middleware - should be early in pipeline
app.UseSecurityHeaders();

// Global CORS policy
app.UseCors("AllowSpecificOrigins");

// Add token blacklist middleware - must be before Authentication
app.UseTokenBlacklist();

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed initial roles
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    string[] roleNames = { "Admin", "User" };

    foreach (var roleName in roleNames)
    {
        var roleExists = await roleManager.RoleExistsAsync(roleName);
        if (!roleExists)
        {
            await roleManager.CreateAsync(new IdentityRole(roleName));
        }
    }
}

app.Run();
