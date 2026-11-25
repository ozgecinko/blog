# Blog Posts

The writing behind **ozgecinko.com/logs**. Pushing here is publishing: the site picks up changes within about 10 minutes.

```
posts/       one Markdown file per post (+ index.json, built automatically)
concepts/    short explainers, reused by [[links]] inside posts
series.yml   names and descriptions of series and categories
```

## Write a post

1. Create `posts/YYYY-MM-DD-<slug>.md`. The part after the date becomes the URL:
   `posts/2026-12-12-biological-dream.md` → `ozgecinko.com/logs/biological-dream`.
   Use lowercase and dashes only, and never rename a published slug (old links would break).
2. Start the file with this header:

   ```yaml
   ---
   title: "Biological Dream"
   date: 2026-12-12 # optional: falls back to the date in the file name
   series: ai-archaeology # optional: a key from series.yml. Leave out for a standalone post
   part: 1 # optional: its place in the series. 0 shows as "intro". Leave out for categories
   summary: "Before silicon, there were neurons." # recommended: shows on hover and in link previews
   lang: en # en (default) or tr
   translation: biyolojik-ruya # optional: slug of the same post in the other language
   draft: true # optional: kept here but not published. Delete the line to publish
   ---
   ```

3. Write the post in Markdown below the header. `##` makes a section heading.
4. Push.

Reading time is counted automatically. If `summary` is missing, the first 200 characters of the first paragraph are used.

## Two languages

Write one file per language, in the same `posts/` folder, and tie them with `translation:` (one side is enough):

| file | header |
|---|---|
| `posts/2026-12-12-biological-dream.md` | `lang: en` |
| `posts/2026-12-12-biyolojik-ruya.md` | `lang: tr`, `translation: biological-dream` |

On the site, `/logs` has a `language [en ▾]` menu (English by default, the visitor's choice is remembered)
and each post shows an `en · tr` switch that jumps to its twin. Give both files the same `series` and `part`.

## Series and categories

Both live in `series.yml`. To add one, append three lines:

```yaml
new-series:
  name: New Series
  description: one short line
```

- **Series** (`ai-archaeology`): posts use `series:` and `part:`. The end of each post links to the
  previous and next part in the same language, found automatically. `part: 0` is the intro.
  `parts:` in series.yml (total planned) is optional and not shown on the site.
- **Category** (`hardware-whispers`): posts use `series:` only, no `part:`.

The name shows next to each post title in `/logs`; clicking it filters the list. Never rename a key once posts use it.

## Notes inside a post

Write `[[spectrogram]]` and the word gets a dotted underline; clicking it opens the note from
`concepts/spectrogram.md` under the paragraph. Same file, every post.

To show different words than the concept's name: `[[spectrogram|spektrogram]]`.

## Concepts

`concepts/<slug>.md`:

```yaml
---
title: Spectrogram
tag: concept # small label next to the title, e.g. concept, 1958, Frank Rosenblatt
formula: STFT(x)[t, f] # optional, shown in mono under the text
---
A picture of sound: time runs left to right, frequency bottom to top.
```

## How the site gets the posts

On every push, a GitHub Action (`.github/workflows/build-index.yml`) runs `scripts/build-index.mjs`,
which writes `posts/index.json`: the list of published posts, the series and the concepts.
The site reads that file, and loads a post's Markdown only when someone opens it.
Never edit `index.json` by hand.

## License

All writing in this repository is by Özge Çinko unless otherwise noted. Please ask before reusing or republishing the posts outside my own websites and profiles.
