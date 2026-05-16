# Directory Structure to Create

When you set up the project, make sure these folders exist:

```
fanflow-ai-complete/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   │
│   └── event/
│       └── [id]/
│           ├── hub/
│           │   └── page.tsx
│           │
│           └── guide/
│               └── page.tsx
│
├── lib/
│   ├── types.ts
│   └── seed.ts
│
├── public/
│   └── (images go here)
│
├── .git (optional)
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## Quick Creation

If using Replit or local:

```bash
mkdir -p app/event/\[id\]/hub
mkdir -p app/event/\[id\]/guide
mkdir -p lib
mkdir -p public
```

Then paste the files into their respective folders.

## Important Notes

- `[id]` is a Next.js dynamic route parameter (keep the brackets)
- `lib/` folder needs `types.ts` and `seed.ts`
- `app/` folder must have `layout.tsx` and `globals.css`
- `public/` is optional for this demo

That's it. You're ready to run `npm install && npm run dev`.
