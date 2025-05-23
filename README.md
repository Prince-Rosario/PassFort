# PassFort - Password Manager

A secure password manager built with .NET 9 using **Layered Architecture** (N-tier Architecture) pattern with **Multi-Factor Authentication (MFA)** support.

## Architecture Pattern

This application follows the **Layered Architecture** pattern, which separates concerns into distinct layers:

### 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│           Presentation Layer        │
│            (PassFort.API)           │
│     Controllers, Middleware         │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Business Logic Layer       │
│            (PassFort.BLL)           │
│      Services, Business Rules       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Data Access Layer          │
│            (PassFort.DAL)           │
│    Repositories, DbContext          │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│         Data Transfer Objects       │
│            (PassFort.DTO)           │
│         DTOs, Configuration         │
└─────────────────────────────────────┘
```

## 🔐 Multi-Factor Authentication (MFA)

PassFort includes comprehensive 2FA support with the following features:

### ✅ MFA Features

- **TOTP (Time-based One-Time Password)** support
- **QR Code generation** for easy authenticator app setup
- **Recovery codes** for account recovery
- **Seamless login integration** with 2FA verification
- **Secure secret key management**

### 🔧 MFA Implementation

#### **Supported Authenticator Apps**

- Google Authenticator
- Microsoft Authenticator
- Authy
- Any TOTP-compatible app

#### **API Endpoints**

| Endpoint                           | Method | Description                  |
| ---------------------------------- | ------ | ---------------------------- |
| `/api/mfa/enable`                  | POST   | Enable 2FA for user account  |
| `/api/mfa/verify`                  | POST   | Verify TOTP code             |
| `/api/mfa/disable`                 | POST   | Disable 2FA for user account |
| `/api/mfa/status`                  | GET    | Get current 2FA status       |
| `/api/mfa/recovery-codes/generate` | POST   | Generate new recovery codes  |
| `/api/mfa/recovery-codes/verify`   | POST   | Verify recovery code         |

#### **Enable 2FA Flow**

1. **User requests 2FA setup** via `/api/mfa/enable`
2. **System generates**:
   - Secret key for TOTP
   - QR code for easy setup
   - 10 recovery codes
3. **User scans QR code** with authenticator app
4. **User verifies setup** with first TOTP code
5. **2FA is activated** for the account

#### **Login with 2FA**

```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "twoFactorCode": "123456"
}
```

If 2FA is enabled and no code is provided, login will fail with a specific error message.

#### **Recovery Codes**

- **10 single-use codes** generated during 2FA setup
- **Can be regenerated** at any time
- **Automatically tracked** (used/unused status)
- **Secure storage** in database

## Project Structure

### 📁 PassFort.API (Presentation Layer)

- **Purpose**: Handles HTTP requests, routing, and API endpoints
- **Responsibilities**:
  - Controllers for handling HTTP requests
  - Middleware for cross-cutting concerns
  - Dependency injection configuration
  - Authentication and authorization setup
- **Contains**: Controllers, Middleware, Program.cs, configuration files

### 📁 PassFort.BLL (Business Logic Layer)

- **Purpose**: Contains business rules and application logic
- **Responsibilities**:
  - Service interfaces and implementations
  - Business logic validation
  - Data transformation and mapping
  - Orchestration of data access operations
- **Contains**: Services, Interfaces, Mappers

### 📁 PassFort.DAL (Data Access Layer)

- **Purpose**: Manages data persistence and database operations
- **Responsibilities**:
  - Entity models
  - DbContext configuration
  - Repository pattern implementation
  - Database migrations
- **Contains**: Entities, Data context, Repositories, Migrations

### 📁 PassFort.DTO (Data Transfer Objects)

- **Purpose**: Defines data contracts for communication between layers
- **Responsibilities**:
  - Request/Response DTOs
  - Configuration objects
  - Data validation attributes
- **Contains**: DTOs, Configuration classes

## ✅ Refactoring Cleanup

During the refactoring process, the following duplicate files were removed from `PassFort.API`:

- ❌ **Services/**: All service implementations moved to `PassFort.BLL`
- ❌ **Models/**: Entity models moved to `PassFort.DAL`, DTOs moved to `PassFort.DTO`
- ❌ **Data/**: DbContext moved to `PassFort.DAL`
- ❌ **Old Migrations**: Regenerated with correct namespace references in `PassFort.DAL`

The API layer now contains only presentation-specific code (controllers, middleware, configuration).

## Key Benefits of Layered Architecture

### ✅ Separation of Concerns

- Each layer has a specific responsibility
- Changes in one layer don't affect others
- Easier to maintain and debug

### ✅ Testability

- Each layer can be unit tested independently
- Mock dependencies easily
- Better test coverage

### ✅ Scalability

- Layers can be scaled independently
- Easy to add new features
- Supports microservices migration

### ✅ Maintainability

- Clear project structure
- Easier onboarding for new developers
- Consistent coding patterns

## Dependencies Flow

```
API → BLL → DAL → Database
 ↓     ↓     ↓
DTO ← DTO ← DTO
```

- **API Layer** depends on BLL and DTO
- **BLL Layer** depends on DAL and DTO
- **DAL Layer** depends on DTO
- **DTO Layer** has no dependencies (pure data contracts)

## Technologies Used

- **.NET 9**: Latest .NET framework
- **ASP.NET Core**: Web API framework
- **Entity Framework Core**: ORM for database operations
- **PostgreSQL**: Database system
- **JWT**: Authentication tokens
- **BCrypt**: Password hashing
- **Identity**: User management
- **OTP.NET**: TOTP implementation
- **QRCoder**: QR code generation

## Getting Started

### Prerequisites

- .NET 9 SDK
- PostgreSQL database
- Visual Studio or VS Code

### Setup

1. Clone the repository
2. Update connection string in `appsettings.json`
3. Run database migrations:
   ```bash
   dotnet ef database update --project PassFort.DAL --startup-project PassFort.API
   ```
4. Build and run:
   ```bash
   dotnet build
   # Startup your docker daemon and run the below cmd to spin up a database
   docker compose up -d
   dotnet run --project PassFort.API
   ```

## Security Features

- JWT-based authentication
- **Multi-Factor Authentication (2FA/TOTP)**
- **Recovery codes for account recovery**
- Refresh token rotation
- Token blacklisting
- Password hashing with BCrypt
- Account lockout after failed attempts
- CORS configuration
- Input validation

## 🔐 MFA Usage Examples

### Enable 2FA

```bash
curl -X POST "https://localhost:7001/api/mfa/enable" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your_current_password"
  }'
```

**Response:**

```json
{
  "sharedKey": "ABCD EFGH IJKL MNOP",
  "authenticatorUri": "otpauth://totp/PassFort:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=PassFort",
  "recoveryCodes": ["abc123", "def456", ...],
  "qrCodeUri": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Verify 2FA Code

```bash
curl -X POST "https://localhost:7001/api/mfa/verify" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### Login with 2FA

```bash
curl -X POST "https://localhost:7001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword",
    "twoFactorCode": "123456"
  }'
```

## Development Guidelines

### Adding New Features

1. Define DTOs in `PassFort.DTO`
2. Create repository interfaces in `PassFort.DAL`
3. Implement business logic in `PassFort.BLL`
4. Add controllers in `PassFort.API`
5. Register dependencies in `Program.cs`

### Best Practices

- Use dependency injection
- Follow SOLID principles
- Implement proper error handling
- Add comprehensive logging
- Write unit tests for each layer
- Use async/await for database operations

## 📱 MFA Setup Guide

1. **Enable 2FA** via API or future web interface
2. **Scan QR code** with your authenticator app
3. **Enter verification code** to confirm setup
4. **Save recovery codes** in a secure location
5. **Use 2FA codes** during login
