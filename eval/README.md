# Evaluation tools

Reusable development tools and small fixtures live here, outside the published CLI package. Compile with npm --prefix framework run build and run offline tests with npm run eval:test.

Pass an explicit built site and task/query fixture to retrieval and answer tools. Some retained authored fixtures target the Shoalrun documentation snapshot; they require a separately prepared matching site. They are study inputs, not claims of current scores or routine release gates. Provider-backed studies are opt-in and require credentials and an agreed budget.

Use capture-build.mjs SITE TASKS OUTPUT to retain exact rendered bytes, provenance, and an ungraded template. Capture refuses to overwrite an earlier run. Historical reports, raw responses and private corpora remain in their original archive. Do not restamp old grades. The optional capture workflow is manual-only and captures a starter fixture without a runner matrix.
