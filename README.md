# Get Down - TypeScript Monorepo

Event services booking platform built with TypeScript, Express, and PostgreSQL.

## 🏗️ Project Structure

```
get-down/
├── packages/
│   ├── shared/        - Shared types & models (API + frontend)
│   ├── api/           - Express backend (TypeScript)
│   └── gui/           - Frontend placeholder
├── pnpm-workspace.yaml
└── tsconfig.json
```

## 📦 Packages

### `packages/shared`

Exports reusable types for both API and frontend:

- `Enquiry`, `Service` - Core models
- `CreateEnquiryRequest`, `EnquiryResponse` - API DTOs
- `SERVICE_NAMES` - Typed service constants
- Factory functions: `createEnquiry()`, `createService()`

### `packages/api`

Express server with full TypeScript typing:

- **Controllers**: HTTP route handlers
- **Services**: Business logic layer
- **Repository**: Typed data access with generic `run_query<T>()`
- **Database**: PostgreSQL with typed row interfaces
- **Utils**: Date formatting, HTML generation, CSV handling
- **Scripts**: Database initialization, CSV/HTML export

### `packages/gui`

Frontend starter template. Import shared types:

```typescript
import { Enquiry, Service } from "@get-down/shared";
```

## 🚀 Quick Start

### Install & Build

```bash
pnpm install
pnpm build
```

### Development

```bash
pnpm -C packages/api dev     # Start dev server with auto-reload
pnpm type-check              # Type check all packages
pnpm test                    # Run tests in all packages
```

### Run Scripts

```bash
pnpm build
node packages/api/dist/scripts/build_db.js    # Initialize database
node packages/api/dist/scripts/csv.js         # Export CSV
node packages/api/dist/scripts/html_table.js  # Export HTML table
```

### Production

```bash
pnpm build
pnpm -C packages/api start   # Start server on port 3000
```

## 🗄️ Database

PostgreSQL schema created by `build_db.ts`:

- `services` - Service catalog
- `enquiries` - Enquiry records
- `enquiries_services` - Many-to-many join table

Environment variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
PORT=3000
```

## 📡 API Endpoints

- `POST /enquiry` - Create enquiry
- `GET /enquiries` - List all enquiries
- `DELETE /enquiry/:id` - Delete enquiry
- `POST /register` - Register user
- `POST /login` - Login user

## 🧵 Shared Types Reference

### Enquiry

```typescript
interface Enquiry {
  id?: number | string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  partnersName?: string;
  email: string;
  phone?: string;
  eventDate?: Date;
  venueLocation?: string;
  services: string[] | Service[];
  otherServices: string[];
  message?: string;
}
```

### Service

```typescript
interface Service {
  id: number;
  name: string;
}
```

### SERVICE_NAMES Constants

```typescript
SERVICE_NAMES.LIVE_BAND; // "Live Band (3/5/7 piece)"
SERVICE_NAMES.WEDDING_FILM; // "Wedding Film"
SERVICE_NAMES.PHOTOGRAPHY; // "Photography"
SERVICE_NAMES.SINGING_WAITER; // "Singing Waiting"
SERVICE_NAMES.BAGPIPES; // "Bagpipes"
SERVICE_NAMES.ACOUSTIC_DUO; // "Acoustic Duo"
SERVICE_NAMES.KARAOKE_BANDEOKE; // "Karaoke/Bandeoke"
SERVICE_NAMES.SAXOPHONE_SOLO; // "Saxophone Solo"
SERVICE_NAMES.DJ; // "DJ"
SERVICE_NAMES.CEILIDH; // "Ceilidh"
```

## 🚢 Deployment to Render

1. Push monorepo to GitHub
2. Create Web Service on Render:
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm -C packages/api start`
3. Set environment variables in Render dashboard:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET`, `FRONTEND_URL`

## 🏗️ Architecture

```
HTTP Request
    ↓
Controllers (Express Request/Response types)
    ↓
Services (business logic, uses @get-down/shared types)
    ↓
Repository (typed database access)
    ↓
Database (PostgreSQL)
```

Each layer is fully typed. Database rows map to typed row interfaces, services map rows to shared `IEnquiry` models, and responses are serialized as DTOs.

## 📝 Notes

- All packages are independent but share types via `@get-down/shared`
- TypeScript compiles to `dist/` in each package
- Tests use Jest with TypeScript support
- Old `/api/` directory kept for reference (can be deleted)
