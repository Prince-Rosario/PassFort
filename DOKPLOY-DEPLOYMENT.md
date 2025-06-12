# PassFort Deployment Guide - Dokploy

This guide will help you deploy PassFort on your DigitalOcean VPS using Dokploy.

## Prerequisites

- DigitalOcean VPS with at least 2GB RAM and 30GB disk space
- Ubuntu 22.04 LTS or later
- Git repository with your PassFort code
- Domain name (optional but recommended)

## Step 1: Install Dokploy on Your VPS

1. SSH into your DigitalOcean VPS:
   ```bash
   ssh root@your-vps-ip
   ```

2. Install Dokploy:
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```

3. Wait for installation to complete (5-10 minutes)

4. Access Dokploy at: `http://your-vps-ip:3000`

5. Create your admin account

## Step 2: Setup Database Service

1. In Dokploy, create a new project called "PassFort"
2. Add a PostgreSQL database:
   - Service Type: **Database**
   - Database Type: **PostgreSQL**
   - Database Name: `passfort`
   - Username: `postgres`
   - Password: `your_secure_password`

## Step 3: Deploy the API Backend

1. Create a new Application in your PassFort project:
   - Name: `passfort-api`
   - Source Type: **Git**
   - Repository URL: `your-git-repo-url`
   - Branch: `main`
   - Build Path: `/`

2. Set up environment variables:
   ```env
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://+:5123
   ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=passfort;Username=postgres;Password=your_password
   JWT__SecretKey=your_very_long_jwt_secret_key_at_least_32_characters_long
   JWT__Issuer=PassFort
   JWT__Audience=PassFort
   ```

3. Configure Build Settings:
   - Build Type: **Docker**
   - Dockerfile Path: `PassFort.API/Dockerfile`

4. Configure Advanced Settings:
   - Port: `5123`
   - Health Check Path: `/health` (if you have one)

5. Deploy the application

## Step 4: Deploy the Frontend Web App

1. Create another Application:
   - Name: `passfort-web`
   - Source Type: **Git**
   - Repository URL: `your-git-repo-url`
   - Branch: `main`
   - Build Path: `/passfort-web`

2. Set up environment variables:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```

3. Configure Build Settings:
   - Build Type: **Docker**
   - Dockerfile Path: `passfort-web/Dockerfile`

4. Configure Advanced Settings:
   - Port: `80`
   - Health Check Path: `/health`

5. Deploy the application

## Step 5: Configure Domains

### For API:
1. Go to your API application → Domains
2. Click "Generate Domain" or add custom domain
3. Set domain to: `api.yourdomain.com`
4. Enable SSL certificate

### For Web App:
1. Go to your web application → Domains
2. Click "Generate Domain" or add custom domain
3. Set domain to: `yourdomain.com`
4. Enable SSL certificate

## Step 6: Database Migration

1. SSH into your VPS
2. Find your API container:
   ```bash
   docker ps | grep passfort-api
   ```
3. Run migrations:
   ```bash
   docker exec -it passfort-api-container-name dotnet ef database update
   ```

## Step 7: DNS Configuration

If using custom domains, update your DNS records:

1. Add A record: `yourdomain.com` → `your-vps-ip`
2. Add A record: `api.yourdomain.com` → `your-vps-ip`

## Alternative: Docker Compose Deployment

You can also deploy using the provided `docker-compose.prod.yml`:

1. Create a new Docker Compose service in Dokploy
2. Upload the `docker-compose.prod.yml` file
3. Set environment variables
4. Deploy

## Environment Variables Reference

Create a `.env` file with these variables:

```env
# Database
POSTGRES_PASSWORD=secure_password_here

# JWT (REQUIRED)
JWT_SECRET_KEY=minimum_32_character_secret_key_here

# API Domain
VITE_API_URL=https://api.yourdomain.com

# Optional
POSTGRES_USER=postgres
POSTGRES_DB=passfort
API_PORT=5123
WEB_PORT=80
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Generate strong JWT secret key
- [ ] Enable SSL certificates
- [ ] Configure firewall (UFW) if needed:
  ```bash
  ufw allow 22    # SSH
  ufw allow 80    # HTTP
  ufw allow 443   # HTTPS
  ufw allow 3000  # Dokploy
  ufw enable
  ```

## Monitoring

Dokploy provides built-in monitoring:
- Application logs
- Resource usage
- Health checks
- Deployment history

## Troubleshooting

### API not starting:
- Check environment variables
- Verify database connection
- Check Dockerfile paths

### Frontend not loading:
- Verify VITE_API_URL points to correct API domain
- Check nginx configuration
- Ensure API is running

### Database connection issues:
- Verify PostgreSQL service is running
- Check connection string format
- Ensure network connectivity between containers

## Backup Strategy

Set up regular backups in Dokploy:
1. Go to your database service
2. Configure automated backups
3. Set backup frequency (daily recommended)

## Updates and Maintenance

1. **Auto-deploy**: Enable webhook for automatic deployments
2. **Manual updates**: Use Dokploy's deployment interface
3. **Database migrations**: Run after API updates
4. **SSL renewal**: Automatic with Dokploy

Your PassFort application should now be fully deployed and accessible! 