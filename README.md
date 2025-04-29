# PassFort - Secure Password Manager API

PassFort is a secure password manager built with ASP.NET Core. This is the backend API that provides authentication, password storage, and management features.

## Features

- Secure user authentication with ASP.NET Core Identity
- JWT-based stateless authentication
- Multi-factor authentication (MFA) support
- PostgreSQL database with Entity Framework Core
- BCrypt password hashing
- Account lockout after failed attempts
- Refresh token support
- Role-based authorization

## Getting Started

### Prerequisites

- .NET 9.0 SDK or later
- Docker (for running PostgreSQL)

### Setup and Run

1. Start the PostgreSQL database using Docker Compose:

   ```
   docker-compose up -d
   ```

2. Apply database migrations:

   ```
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

3. Run the application:
   ```
   dotnet run
   ```

The API will be available at `https://localhost:7000` and `http://localhost:5000`.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Log in a user

## Development

### Creating Migrations

```
dotnet ef migrations add [MigrationName]
dotnet ef database update
```

## Security Features

- AES-256 encryption for password data
- Secure password storage with BCrypt
- JWT with short expiry and refresh tokens
- Account lockout after multiple failed login attempts
- Master password is never stored in plain text
- Recovery key generation for account recovery
