# Blog Posts

The writing behind **ozgecinko.com/logs**. The site reads this repo when it builds,
so pushing here is publishing.

```
posts/       one Markdown file per post (+ index.json, built automatically)
concepts/    short explainers, reused by [[links]] inside posts
series.yml   names and descriptions of the series
```

## Write a post

1. Create `posts/YYYY-MM-DD-<slug>.md`. The part after the date becomes the URL:
   `posts/2026-12-12-biological-dream.md` → `ozgecinko.com/logs/biological-dream`.
   Use lowercase and dashes only, and never rename a published slug (old links would break).
2. Start the file with this header:

   ```yaml
   ---
   title: "Biological Dream"
   date: YYYY-MM-DD
   series: series-name # optional: a key from series.yml. Leave out for a standalone post
   part: 1 # optional: its place in the series
   summary: "Before silicon, there were neurons." # optional: shows on hover and in link previews
   draft: true # optional: drafts are kept here but never published
   ---
   ```

3. Write the post in Markdown below the header. `##` makes a section heading.
4. Push. The site rebuilds and the post is live a few minutes later.

Reading time is counted automatically.

## Notes inside a post

Write `[[spaced repetition]]` and the words get a blue dotted underline; clicking them opens
the note from `concepts/spaced-repetition.md` under the paragraph. Same file, every post.

To show different words than the concept's name: `[[spaced-repetition|reviewing just in time]]`.

## Concepts

`concepts/<slug>.md`:

```yaml
---
title: Spaced repetition
tag: concept # small label next to the title, e.g. concept, 1958, Frank Rosenblatt
formula: next = last × ease # optional, shown in mono under the text
---
Review a word just before you would forget it. Each successful recall pushes the next review further away.
```

## How the site gets the posts

On every push, a GitHub Action (`.github/workflows/build-index.yml`) runs `scripts/build-index.mjs`,
which writes `posts/index.json`: the list of published posts, the series and the concepts.
The site reads that file plus the post files themselves. Never edit `index.json` by hand.

## License

All writing in this repository is by Özge Çinko unless otherwise noted. Please ask before reusing or republishing the posts outside my own websites and profiles.
