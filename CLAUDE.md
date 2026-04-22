# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SampleFinder Admin Dashboard - A React-based administrative panel for managing events, users, trivia, reviews, and notifications. Built with TypeScript, Vite, and Appwrite as the backend service.

## Core Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs TypeScript check then Vite build)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Appwrite Functions
Navigate to function directory first, then:
- `npm run build` - Build TypeScript functions (copies to src/main.js)
- Functions located in: `appwrite/functions/Mobile API`, `appwrite/functions/Notification functions`, `appwrite/functions/Statistics functions`

### Scripts
- `npm run backfill:event-location-ids` - Backfill location IDs for existing events

## Architecture Overview

### Frontend Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with Tailwind CSS
- **Router**: React Router DOM v7
- **State Management**: Zustand stores (authStore, notificationStore, timezoneStore)
- **Backend**: Appwrite SDK for authentication, database, storage, and serverless functions

### Key Directories
- `src/pages/` - Page components organized by feature (Dashboard, Users, Events, etc.)
- `src/components/` - Shared UI components
- `src/lib/` - Utilities and Appwrite configuration
- `src/stores/` - Zustand state management
- `appwrite/functions/` - Serverless functions for Mobile API, Notifications, and Statistics

### Database Collections
All collections are in database ID `69217af50038b9005a61`:
- user_profiles
- clients
- events (supports optional locationId attribute)
- trivia & trivia_responses
- reviews
- notifications
- categories
- locations
- settings
- tiers

### Environment Configuration
Copy `.env.example` to `.env` and configure:
- Appwrite endpoint, project ID, database ID
- Collection IDs for all entities
- Storage bucket ID
- Function IDs for Mobile API, Statistics, and Notifications
- Optional: `VITE_APPWRITE_EVENTS_HAS_LOCATION_ID` flag for location support

### Authentication Flow
- Uses Appwrite Account service with cookie-based sessions
- Protected routes wrap components with `ProtectedRoute`
- Auth state managed in `authStore` with Zustand

### Key Features
- **Events Management**: CRUD operations with location support, CSV upload, custom scheduling
- **Trivia System**: Questions, responses, and detailed analytics
- **User Management**: Admin and regular user roles with profile management
- **Notifications**: Push notification system with targeting and scheduling
- **Reports**: PDF generation with jsPDF for event analytics
- **Reviews**: Event review management with star ratings
- **Location Services**: Google Maps integration for address autocomplete and location picking

### Testing Approach
No test framework is currently configured. To add tests, install and configure a testing library like Vitest or Jest.