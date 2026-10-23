# Build separate sites from shared content

From this directory, with Shoalrun installed:

```sh
shoalrun build docs.config.yaml dist/main
shoalrun build developers.config.yaml dist/developers
shoalrun build europe.config.yaml dist/europe
```

The configs share `content/` and `base.yaml`. The main site includes all three
pages; the developer site selects the `audience` facet; the European site selects
the custom `region` facet and uses `/resources` as its base path. Each site has
its own navigation and origin. Deploy each output directory independently.

`site.contentFilter` requires a match for every selected facet. Choices within
one facet are alternatives. An unmarked page is excluded. Mark shared pages with
all applicable values, or supply appropriate `readerFilters.typeDefaults`.
Unknown facets, unknown choices, empty selectors, and selections with no pages
fail the build. Omit `contentFilter` to publish all otherwise eligible pages.

Selection applies to whole authored and generated pages before rendering. A
selected page retains its complete body, including reader-marked sections.
Reader controls do not bring excluded pages back. Keep links and navigation
within the selected set; missing targets fail validation. Configure API sources
and operation selection separately: publishing an API contract may expose the
whole configured source. Page selection is not an access-control mechanism.

Content paths are relative to the entry config, so these entry files are siblings.
Each build replaces its own output directory; keep outputs separate from sources
and from one another. Build selection does not deploy or synchronize sites.
