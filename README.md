# Retail Assistant Web Application

A web application for retail analytics and insights, providing AI-powered assistance for retail businesses.

**Live Demo**: [https://retail-assistant-web.vercel.app](https://vercel.com/sllilands-projects/retail-assistant-web)

## Overview

Retail Assistant is a comprehensive analytics platform that helps retail businesses make data-driven decisions through an intuitive chat interface, automated reports, and real-time insights.

## Features

- **AI-Powered Chat Interface**: Natural language queries for retail data analysis
- **Real-Time Analytics**: Instant insights into sales, products, and regional performance
- **Interactive Reports**: Comprehensive business intelligence dashboards
- **Weekly Spotlights**: Automated analysis of key performance indicators
- **User Authentication**: Secure login with email, GitHub, and Google OAuth
- **Location Services**: Personalized insights based on geographic data

## Screenshots

![Welcome Page](https://white-bitter-moth-609.mypinata.cloud/ipfs/bafybeiawyxvkz5fzrrxnixgim52isrghvmytycwgf3hvyvzof3cj3ty4wq "Welcome")

![Sign In Page](https://white-bitter-moth-609.mypinata.cloud/ipfs/bafybeiecoeiysbsul2kfaq5t7bbrjnwrkvwagvvzux5svbvdk5rnwidk7q "Sign In")

![Sign Up Page](https://white-bitter-moth-609.mypinata.cloud/ipfs/bafybeiclkr3avwke2xpmpyh2ki4enywzxeyom72tzx25fp3afo5odmxlhq "Sign Up")

![Side Bar](https://white-bitter-moth-609.mypinata.cloud/ipfs/bafybeiby75ecmd2ghzeo6ulub6cvr2suajfrqaqg6ugldjr5kwyvmq733y "Side Bar")

![Profile Page](https://white-bitter-moth-609.mypinata.cloud/ipfs/bafybeicdzoapxba7kpqdwnonngd6q3vjymsfcuowvlkx3bgqhbowgit54q "Profile")

![Chat Page](https://white-bitter-moth-609.mypinata.cloud/ipfs/bafybeifljuw6hjkipff73glsmptri5fh5hhdyb5oneqzxzhyvcizqmpitu "Chat")

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Backend Integration
- **API**: FastAPI (Python)
- **Authentication**: Supabase Auth
- **Database**: Google Firestore
- **AI/ML**: OpenAI GPT-4

### Typography
- **BigCaslon**: Body text and general content
- **Zapfino**: Headlines and decorative elements

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for authentication)
- Backend API running (see main repository)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd retail-assistant-web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

```

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm run test         # Run test suite (if configured)
```

## Configuration

### Next.js Configuration

The application uses Next.js Image optimization with configured remote patterns for:
- GitHub avatars (`avatars.githubusercontent.com`)
- Google profile pictures (`lh3.googleusercontent.com`)

### Supabase Setup

1. Create a new Supabase project
2. Enable authentication providers:
   - Email/Password
   - GitHub OAuth
   - Google OAuth
3. Configure OAuth redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## API Integration

The application integrates with a FastAPI backend. Ensure the backend is running and accessible at the configured `NEXT_PUBLIC_API_URL`.

### Endpoints Used
- `POST /api/v1/chat` - Chat message processing
- `GET /api/v1/spotlight/preview` - Weekly spotlight data
- Additional endpoints as needed

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Other Platforms

The application can be deployed to any platform supporting Next.js:
- AWS Amplify
- Netlify
- Railway
- DigitalOcean App Platform

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- HTTPS required in production for OAuth and geolocation
- Environment variables for sensitive data
- Supabase Row Level Security (RLS) enabled
- Input sanitization on all user inputs
- CSRF protection via Supabase Auth

## Performance

- Server-side rendering (SSR) for optimal initial load
- Image optimization with Next.js Image component
- Code splitting for reduced bundle size
- Lazy loading of components
- Caching strategies for API responses

## Accessibility

- WCAG 2.1 Level AA compliance target
- Keyboard navigation support
- Screen reader compatibility
- Semantic HTML structure
- Color contrast ratios meet standards

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Specify your license]

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Acknowledgments

- Next.js team for the excellent framework
- Supabase for authentication infrastructure
- OpenAI for AI capabilities
- Open source community for various dependencies

---

Built with Next.js, React, and modern web technologies.
