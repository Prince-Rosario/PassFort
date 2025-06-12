FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["PassFort.API/PassFort.API.csproj", "PassFort.API/"]
COPY ["PassFort.BLL/PassFort.BLL.csproj", "PassFort.BLL/"]
COPY ["PassFort.DAL/PassFort.DAL.csproj", "PassFort.DAL/"]
COPY ["PassFort.DTO/PassFort.DTO.csproj", "PassFort.DTO/"]

RUN dotnet restore "PassFort.API/PassFort.API.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/PassFort.API"
RUN dotnet build "PassFort.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PassFort.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM runtime AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose the port
EXPOSE 5123

ENTRYPOINT ["dotnet", "PassFort.API.dll"] 