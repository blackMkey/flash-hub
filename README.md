# Flash hub - Next.js + Chakra UI

This is a [Next.js](https://nextjs.org) project with [Chakra UI](https://v2.chakra-ui.com/) integration, bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- ⚡ **Next.js 16** with App Router
- 🎨 **Chakra UI v3** for beautiful, accessible components
- 📝 **TypeScript** for type safety
- 🔧 **ESLint** for code quality
- 🏗️ **src/ directory** structure

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
flash-hub/
├── src/
│   └── app/
│       ├── layout.tsx      # Root layout with ChakraProvider
│       ├── providers.tsx   # Chakra UI provider setup
│       ├── page.tsx        # Home page with sample components
│       └── globals.css     # Global styles
├── public/                 # Static assets
└── package.json           # Dependencies and scripts
```

## Chakra UI Setup

This project includes:

- ChakraProvider configured in `src/app/providers.tsx`
- Sample components demonstrating Chakra UI usage
- Modern design system with consistent theming

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Chakra UI Documentation](https://v2.chakra-ui.com/) - learn about Chakra UI components and theming
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - learn about TypeScript

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
