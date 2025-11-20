# ECOVIS Austria Website

A static website recreation of the ECOVIS Austria website.

## Deployment

This site is configured for deployment on Vercel.

### Deploy to Vercel

1. **Using Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Using Vercel Dashboard:**
   - Connect your Git repository to Vercel
   - Vercel will automatically detect and deploy the static site

3. **Manual Deployment:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel --prod` to deploy to production

## Project Structure

- `index.html` - Homepage
- `about-us.html` - About Us page
- `services.html` - Services page
- `industries.html` - Industries page
- `customer-portal.html` - Customer Portal page
- `styles.css` - Main stylesheet
- Service subpages: `tax.html`, `accounting.html`, `payroll.html`, `audit.html`, `management-consulting.html`, `expert-opinions.html`
- About Us subpages: `company.html`, `locations.html`, `our-people.html`, `philosophy.html`, `ecovis-international.html`

## Features

- Fully responsive design
- Static HTML/CSS/JavaScript
- ElevenLabs Conversational AI widget integrated across all pages
- No build process required

## Configuration

The `vercel.json` file includes:
- Security headers
- Cache control for static assets
- Proper routing configuration

