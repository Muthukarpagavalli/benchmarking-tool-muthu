# Legal tech benchmarking tool example project

This is a Next.js + Prisma app for:

1. Market knowledge bank
2. Peer firm benchmarking
3. Scoring frameworks and exports

## Free hosting path

For a free deployment, use:

1. `Vercel Hobby` for the app
2. `Supabase Free` for the database

That setup works better than the current local SQL Server approach because Prisma supports PostgreSQL and Supabase provides a free hosted Postgres database.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account
- A Vercel account

## 1. Create a Supabase project

1. Create a new Supabase project.
2. Copy the connection string into your `.env` file as `DATABASE_URL`.
3. Use the PostgreSQL connection string format shown in `.env.example`.

## 2. Install dependencies

```bash
npm install
```

## 3. Update the database

After pointing `DATABASE_URL` at Supabase, push the Prisma schema:

```bash
npx prisma db push
```

Then seed the database if needed:

```bash
npm run db:seed
```

## 4. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`

## 5. Deploy to Vercel

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Set `DATABASE_URL` in the Vercel project environment variables.
4. Deploy.

## Notes

- The database is now configured for PostgreSQL instead of SQL Server.
- The old local Docker SQL Server workflow is no longer the recommended path for hosting.
- Supabase Free is suitable for demos and low-traffic sharing, but it pauses inactive projects after a period of inactivity.
