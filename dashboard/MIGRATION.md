# Dashboard Migration to Next.js

This dashboard has been migrated from vanilla HTML/TypeScript to **Next.js 16** with full MDX support for blog-style rendering of daily task results.

## What's New

### Blog-Style Result Rendering
- Each daily run result (`.md` file) is now rendered as a beautiful blog post
- Supports YAML frontmatter for metadata (tokens, cost, model, response time)
- Full markdown rendering with:
  - Syntax highlighting for code blocks
  - GitHub Flavored Markdown (tables, task lists, etc.)
  - Auto-linked headings
  - Responsive design with dark mode support

### Modern Stack
- **Next.js 16** with App Router
- **React 19** for UI components
- **Tailwind CSS v4** for styling
- **React Markdown** with syntax highlighting
- **TypeScript** for type safety
- **Static Site Generation** for GitHub Pages

## Project Structure

```
dashboard/
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx                # Homepage with task cards
│   └── results/
│       └── [taskName]/[date]/
│           └── page.tsx        # Dynamic blog-post result page
├── components/
│   ├── Navigation.tsx          # Header with dark mode toggle
│   ├── TaskCard.tsx            # Task summary cards
│   └── MDXContent.tsx          # Markdown renderer component
├── lib/
│   ├── data-fetcher.ts         # Analytics data fetching
│   ├── result-parser.ts        # Parse MD files with frontmatter
│   ├── types.ts                # TypeScript type definitions
│   └── utils.ts                # Formatting utilities
├── data/                       # Analytics and build data
├── public/                     # Static assets
└── out/                        # Build output (static HTML)
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

## How It Works

### 1. Data Flow

1. **Build Time**: Next.js reads `data/analytics.json` and scans `../tasks/*/results/*.md` files
2. **Static Generation**: Generates static HTML pages for:
   - Homepage with task summary cards
   - Individual result pages for each `.md` file
3. **Deployment**: Exports to `out/` directory for GitHub Pages

### 2. Result File Format

Daily results in `tasks/{task-name}/results/{date}.md`:

```markdown
---
timestamp: "2025-10-27T10:30:00Z"
model: "gpt-4"
tokensUsed: 1500
estimatedCost: 0.045
responseTime: 2340
status: "success"
provider: "openai"
---

# Your Daily Result Title

Your markdown content here with **formatting**, `code`, and more!

## Sections

- Lists
- Tables
- Code blocks

\`\`\`python
print("Hello, World!")
\`\`\`
```

### 3. Blog-Post Rendering

Each result page includes:
- **Header**: Task name, date, reading time, status
- **Metadata Cards**: Model, tokens, cost, response time
- **Content**: Fully rendered markdown with syntax highlighting
- **Footer**: Back to dashboard link
- **Responsive**: Mobile-friendly with dark mode

## Deployment

The dashboard is configured for static export:

```typescript
// next.config.ts
const nextConfig = {
  output: 'export',  // Generate static HTML
  images: {
    unoptimized: true, // For GitHub Pages
  },
};
```

Build output in `out/` can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting

## Migration Notes

### Breaking Changes
- Old dashboard files backed up to `/dashboard-backup/`
- New component-based architecture
- Different data fetching approach (build-time vs runtime)

### Preserved Features
- All analytics data (`data/analytics.json`)
- All task results (`tasks/*/results/*.md`)
- Documentation (`guide/` directory)
- Custom purple/cream color scheme
- Dark mode support

### New Features
- Blog-style result rendering
- Markdown with syntax highlighting
- Better mobile responsiveness
- Faster page loads (static HTML)
- SEO-friendly pages

## Customization

### Colors

Edit `app/globals.css`:

```css
@theme inline {
  --color-purple-DEFAULT: #6b4fbb;
  --color-purple-light: #8b7fc7;
  --color-cream: #faf9f6;
  --color-beige: #f5f3ef;
}
```

### Syntax Highlighting Theme

Edit `components/MDXContent.tsx` to change the code theme:

```tsx
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
// Try: dracula, atomDark, tomorrow, etc.
```

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next out node_modules
npm install
npm run build
```

### Missing Results

Check that result files exist in `tasks/{name}/results/*.md` with valid frontmatter.

### Font Issues

The dashboard uses system fonts. For custom fonts, add to `app/layout.tsx`.

## Next Steps

- Add pagination for task results
- Implement search/filter functionality
- Add RSS feed for results
- Create task comparison views
- Add export functionality (PDF, etc.)
