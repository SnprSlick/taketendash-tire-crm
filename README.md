# TakeTenDash - Tire CRM Dashboard

A comprehensive Customer Relationship Management (CRM) application designed specifically for tire shops and automotive service centers. Built with modern web technologies to streamline operations, manage customer relationships, and integrate with tire inventory systems.

## 🚀 Features

### Core Functionality
- **Sales Analytics Dashboard** - Real-time sales metrics, performance tracking, and revenue analysis
- **Service Reminders** - Automated customer service reminder system with multiple communication channels
- **Appointment Management** - Complete scheduling system for customer appointments and service bookings  
- **Performance Analytics** - Employee performance tracking and analytics with detailed reporting
- **Large Accounts Management** - Specialized tools for managing commercial and fleet customers
- **Tire Master Integration** - Direct integration with Tire Master POS system for inventory and pricing

### Technical Features
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI/UX** - Clean, professional interface built with Tailwind CSS
- **Real-time Updates** - Live data synchronization and updates
- **Export Capabilities** - Data export functionality for reports and analysis
- **Docker Support** - Containerized deployment for easy development and production setup

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router with dynamic navigation

### Backend
- **Framework**: NestJS 10
- **Language**: TypeScript 5.3+
- **Database**: PostgreSQL with Prisma ORM 5
- **API**: GraphQL with Apollo
- **Authentication**: JWT-based authentication
- **Cache**: Redis for session and data caching

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Development**: Hot reload with volume mounting

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+ LTS
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/taketendash.git
   cd taketendash
   ```

2. **Start with Docker (Recommended)**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Or run locally**
   
   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   
   **Backend:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **CSV Import API**: http://localhost:3001/api/v1/csv-import

## 📁 Project Structure

```
TakeTenDash/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # Reusable React components
│   │   ├── lib/            # Utility libraries
│   │   └── types/          # TypeScript type definitions
│   ├── package.json
│   └── Dockerfile.dev
├── backend/                  # NestJS backend application
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── common/         # Shared utilities
│   │   └── prisma/         # Database schema and migrations
│   ├── package.json
│   └── Dockerfile.dev
├── docker-compose.dev.yml    # Development environment
└── README.md
```

## 🔧 Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

**Backend:**
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Run database migrations

### Key Components

**Navigation & Layout:**
- `DashboardLayout` - Main layout component with consistent header and navigation
- Dynamic navigation highlighting based on current route
- Responsive design for all screen sizes

**Feature Modules:**
- **Sales Dashboard** - Analytics and metrics visualization
- **Service Reminders** - Automated reminder management
- **Appointments** - Calendar and booking management
- **Performance** - Employee analytics and reporting
- **Tire Master** - POS system integration

## 🔄 Tire Master Integration

The application includes deep integration with Tire Master POS systems:
- **Product Search** - Browse tire catalog with real-time availability
- **Inventory Sync** - Automated synchronization of inventory levels
- **Pricing Updates** - Real-time pricing information
- **Order Management** - Seamless order processing workflow

## 📱 Responsive Design

Built with mobile-first approach:
- **Desktop** - Full feature set with optimized layouts
- **Tablet** - Adaptive UI with touch-friendly interactions  
- **Mobile** - Streamlined interface for on-the-go access

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Build backend  
cd backend && npm run build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
Create `.env` files in both frontend and backend directories:

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
```

**Backend (.env):**
```
DATABASE_URL="postgresql://user:password@localhost:5432/tire_crm"
JWT_SECRET="your-jwt-secret"
REDIS_URL="redis://localhost:6379"
```

## 📚 API Documentation

### Base URL
All API endpoints are prefixed with `/api/v1/`
- **Development**: `http://localhost:3001/api/v1/`
- **Production**: `https://your-domain.com/api/v1/`

### CSV Import API

#### File Upload & Import
```http
POST /api/v1/csv-import/upload
Content-Type: multipart/form-data

Body:
- file: CSV file (TireMaster format)
- duplicateHandling: "SKIP" | "UPDATE" | "RENAME" | "MERGE" | "FAIL" (optional, default: SKIP)
- strictMode: boolean (optional, default: false)
- batchSize: number (optional, default: 100)
```

#### Server File Import
```http
POST /api/v1/csv-import/import
Content-Type: application/json

{
  "filePath": "/path/to/file.csv",
  "duplicateHandling": "SKIP",
  "strictMode": false,
  "batchSize": 100
}
```

#### File Validation Only
```http
POST /api/v1/csv-import/validate
Content-Type: application/json

{
  "filePath": "/path/to/file.csv"
}
```

#### Get Import Batches
```http
GET /api/v1/csv-import/batches
Query Parameters:
- page: number (optional, default: 1)
- limit: number (optional, default: 20)
- status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "ROLLED_BACK" (optional)
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)
```

#### Get Import Progress
```http
GET /api/v1/csv-import/progress/{batchId}
```

#### Get Batch Errors
```http
GET /api/v1/csv-import/batches/{batchId}/errors
Query Parameters:
- page: number (optional, default: 1)
- limit: number (optional, default: 50)
```

#### Rollback Import Batch
```http
POST /api/v1/csv-import/batches/{batchId}/rollback
```

### Invoice API

#### Get Invoices
```http
GET /api/v1/invoices
Query Parameters:
- page: number (optional, default: 1)
- limit: number (optional, default: 20)
- search: string (optional, search by invoice number or customer)
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)
```

#### Get Invoice by Number
```http
GET /api/v1/invoices/{invoiceNumber}
```

#### Get Invoice Statistics
```http
GET /api/v1/invoices/stats/summary
Query Parameters:
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "details": { ... }
}
```

### Duplicate Handling Strategies

- **SKIP**: Skip duplicate records without error
- **UPDATE**: Update existing records with new data
- **RENAME**: Create new record with modified invoice number
- **MERGE**: Merge line items into existing invoice
- **FAIL**: Fail import when duplicates are found

### Error Codes

- **P2002**: Unique constraint violation (duplicate record)
- **VALIDATION**: Data validation failed
- **FORMAT**: Invalid file format
- **BUSINESS_RULE**: Business logic violation
- **MISSING_DATA**: Required field missing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review existing issues for solutions

## 🏢 About

TakeTenDash is designed to modernize tire shop operations with powerful CRM capabilities, seamless POS integration, and comprehensive analytics to help businesses grow and serve customers better.

---

**Built with ❤️ using Next.js, NestJS, and modern web technologies**
