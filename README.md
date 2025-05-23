# PassFort - Password Manager

A secure password manager built with .NET 9 using **Layered Architecture** (N-tier Architecture) pattern.

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
- ❌ **MfaController**: Temporarily removed until MfaService is implemented in BLL

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
   #startup your docker daemon and run the below cmd to spin up a database
   docker compose up -d
   dotnet run --project PassFort.API
   ```

## Security Features

- JWT-based authentication
- Refresh token rotation
- Token blacklisting
- Password hashing with BCrypt
- Account lockout after failed attempts
- CORS configuration
- Input validation

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
