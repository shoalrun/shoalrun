## How to read this benchmark

This benchmark asks: **when someone searches our documentation, does the right page appear near the top?** It compares search results, not the quality of a chatbot's written answers. Higher Hit rates and MRR are better; lower request times are faster.

Read the **vector** rows to compare embedding models by themselves. Read the **hybrid** rows to compare those models with Shoalrun's current word-matching and ranking combination. A lower hybrid score means that combination moved useful results down; it does not mean the embedding model changed.

The **Documents** column names the model that converted the documentation into embeddings. The **Queries** column names the model that converted the search questions. These can differ when the provider explicitly supports compatible models. For example, `voyage-4-large / voyage-4-lite` means Large embeds the docs and Lite embeds the questions. `none / none` means word matching without an embedding model. Voyage and Cohere are the providers; Large, Lite, Pro, and Fast are model names, not benchmark scores.

### Text and search terms

| Term | Plain-language meaning |
| --- | --- |
| Benchmark | A repeatable test that compares systems on the same inputs and scoring rules. |
| Corpus; frozen corpus | The collection of documentation being searched. Frozen means its contents stay fixed between comparisons. |
| Document; page | One published documentation page. Stable document IDs identify pages even if their URLs change. |
| Passage; chunk | A smaller section of a page. Search first ranks passages, then this benchmark scores distinct pages. |
| Chunking | Splitting pages into passages. Keeping this the same helps make model comparisons fair. |
| Query | The words or question someone enters into search. A query here is a labeled test case, not a chatbot response. |
| Retrieval | Finding and ordering existing documentation that may answer a query. |
| Index | Prepared data that makes the documentation searchable. This test uses a passage index and model-specific embeddings. |
| Embedding; vector | A list of numbers that an embedding model creates from text. Similar text tends to produce vectors that are close together. The numbers are not a written answer or an explicit list of topics. |
| Embedding model | A model that converts text into vectors so search can compare its meaning. |
| Dimensions | The number of values in each vector: 1,024 in this test. More dimensions do not automatically mean better results. |
| float32 | A number format using 32 bits for each value. All models use the same format here. |
| Normalized vector | A vector scaled to have length one. This makes the similarity calculation consistent. |
| Cosine similarity | A comparison of the directions of two vectors. More similar directions receive higher scores. It is not a probability that a page is correct. |
| Shared embedding space | A provider-supported arrangement in which different models produce compatible vectors. Matching dimensions alone does not make models compatible; we do not mix Voyage and Cohere vectors. |
| Document/query input types | API settings telling the provider whether text is documentation to store or a question to search with. These can affect the resulting vectors. |
| Lexical search | Word matching, useful for exact names, commands, configuration keys, and error messages. |
| BM25 | “Best Matching 25,” a standard word-matching scoring formula. It rewards query words that are uncommon across the corpus, considers their frequency in a passage with diminishing returns, and adjusts for passage length. Shoalrun adds title, heading, phrase, and synonym bonuses. |
| Semantic; vector search | Searching by similarity of meaning using embeddings. It can match “publish my site” with documentation that says “deploy your documentation.” |
| Hybrid search | Combining word-matching and vector results. It can help exact terms, but a poorly balanced combination can lower useful results. |
| Reciprocal rank fusion (RRF) | Combining rankings using positions rather than their raw scores. Here each passage receives `1 / (60 + position)` from each list in which it appears, with positions starting at one. The contributions are added with equal weight. The number 60 softens the advantage of the first few positions. |
| Retrieval depth; page collapse | How many passages search considers, and how multiple passages from the same page become one page result. Hybrid considers up to 240 passages from each search and keeps 60 after fusion; vector keeps 60 directly. Pages keep the order of their first appearance. |
| Reranker | An extra model or scoring step that reorders retrieved results after the initial search. This benchmark uses no reranker. |
| Publication scope; reader filters | Settings that restrict eligible results to an edition, language, or selected reader view. The same settings apply to all models. Reader views control visibility, not authorization. |
| Truncation | Cutting off text to fit a limit. Provider input truncation is disabled here so models receive the complete submitted text. |

### Labels and success scores

| Term | Plain-language meaning |
| --- | --- |
| Label; expected page | The page or pages chosen in advance as acceptable answers to a test query. Labels can miss other relevant pages. |
| Answerable; no-answer (`none`) | Answerable means the frozen docs contain an expected answer. No-answer cases ask for information those docs do not contain. They remain in the JSON but are excluded from Hit rates and MRR; this report does not score whether search correctly refuses an unanswerable question. |
| Alternative pages | Multiple acceptable pages for one question. Finding any one satisfies that group. |
| Expected groups; synthesis | A question needing several pieces of information can have multiple groups of acceptable pages. A hit requires a page from every group. |
| Rank | A page's position in the search results, starting at one. For multiple expected groups, we use the position where all groups have been found. JSON rank `0` means at least one group was not found within the retrieved results. |
| Hit@1 / Hit@3 / Hit@5 / Hit@10 | The percentage of answerable queries whose expected pages were found within the first 1, 3, 5, or 10 distinct pages. For example, Hit@3 of 95% means success within the first three pages for about 95 out of 100 answerable questions. |
| MRR | Mean reciprocal rank: average `1 / rank` across answerable questions, with a miss contributing zero. First place contributes 1, second 0.5, third about 0.333. The score ranges from 0 to 1 and rewards finding answers early. For synthesis questions this test uses the rank where all required groups are satisfied. |
| Why Hit@3 and MRR can disagree | A model can find more answers within three pages yet put fewer of them first. Hit@3 rewards top-three success equally; MRR rewards first place more than second or third. |
| Split; original; additional | Subsets of the query set. The original fixture contains 94 cases, including 83 answerable ones. The expanded benchmark adds 106 cases, including 96 answerable ones, for 200 total and 179 answerable. |
| Fixture; CI | A fixture is saved test data. CI means continuous integration: automated checks run as code changes. The original fixture is also used by those checks. |
| Query kinds | `exact`: names or identifiers; `task`: how to accomplish something; `paraphrase`: different wording for a topic; `concept`: explanations; `mixed`: combinations of wording or intent; `typo`: misspelled queries; `synthesis`: multiple required pieces; `none`: no documented answer. These are author-assigned categories, not model judgments. |
| Held-out evaluation | A test set kept separate from examples used to develop or tune the system. These author-labeled queries are not an independently judged held-out evaluation, so the results do not establish which model is best for all search tasks. |

### Comparisons and uncertainty

| Term | Plain-language meaning |
| --- | --- |
| Baseline; candidate | The reference setup and the setup compared against it. Here the baseline uses Voyage Large for documents and Voyage Lite for queries. Comparisons use the same search mode on both sides. |
| Paired comparison | Comparing both setups on the same questions, rather than comparing unrelated sets of questions. |
| Hit@3 difference; delta | Candidate Hit@3 minus baseline Hit@3, expressed in **percentage points**. Going from 90% to 92% is +2 percentage points. A positive difference favors the candidate; a negative one favors the baseline. |
| Wins; losses; ties | A win means the candidate succeeds within three pages and the baseline misses. A loss is the reverse. A tie means both succeed or both miss; it does not require identical rankings. |
| Bootstrap; seeded sampling | Repeatedly drawing questions from this set, allowing repeats, to estimate how much the paired difference varies. The test uses 2,000 samples. A fixed random seed makes the calculation repeatable. |
| 95% interval | The middle 95% of those bootstrap differences. An interval crossing zero includes both an advantage and a disadvantage. It is not a 95% probability that a model is universally better. Related questions can make these intervals look more certain than an independent test would. |
| Independent queries | Questions whose outcomes do not strongly depend on the same topic or wording. Many questions here cover related pages, so their outcomes can be linked. |

### Timing and reproducibility

| Term | Plain-language meaning |
| --- | --- |
| API; request | The provider's interface, and one call to it asking for embeddings. API stands for application programming interface. |
| Batch | Several texts embedded in one request, up to 32 here. One request does not necessarily mean one passage or query. |
| Live / cached | Live means an API call was made; cached means a previously saved result was reused. For example, `0/35` means zero live requests and 35 reused batches. |
| Live document ms | Total measured time for live document-embedding requests in this run, in milliseconds. Zero means every document batch was cached, not that embedding the corpus originally took no time. |
| Single-query samples | Fresh API calls that each embed one query, bypassing the cache. Their times estimate embedding request latency. Samples include repeated query texts and are separate from the full set of quality-test questions. |
| Latency; p50; p95 | Latency is elapsed request time. p50 is the median: about half the measured calls were at or below it. p95 is the value at or below which about 95% fell. Lower is faster; 100 ms is one tenth of a second. |
| Network time; retries | Travel time to the provider and extra attempts after a failed request. Both are included in measured live request time. |
| Rate-limit pacing; wall time | Pacing deliberately waits to stay under the provider's request/token limits. These waits are excluded from the timing samples. Wall time is the elapsed time for the whole run, including waits and other work. The timing table is not total wall time or end-to-end search latency. |
| Token; billed tokens | A token is a piece of text counted by a model's tokenizer. Providers may report billed input-token counts. Recorded usage covers the live quality-embedding batches, not cached requests or the separate latency samples, so it is not a complete billing statement. |
| JSON; schema version | JSON is the structured data file behind the readable report. A schema version identifies the report's field layout. |
| Digest; fingerprint; SHA-256 | A reproducible hash of input data used to check that the corpus or questions have not changed. SHA-256 is the hashing algorithm. These hashes are not API keys or encryption passwords. |
| Reproducibility | Keeping the inputs and settings available so another run can be compared fairly. Provider updates and changing network conditions can still affect results. |

### Guide to the JSON fields

| Fields | What they contain |
| --- | --- |
| `schemaVersion`, `createdAt`, `dimension` | Report layout version, UTC run timestamp, and vector length. |
| `corpusDigest`, `queryDigest` | Fingerprints of the passage index and labeled query file. |
| `pages`, `passages`, `queries`, `answerable` | Counts of distinct docs, text chunks, test cases, and cases included in success scores. `queries` is also used inside a model record for query-request statistics. |
| `models`, `name`, `provider`, `status`, `error` | Embedding model records, provider names, completion status, and any sanitized error message. |
| `documents`, `queries`, `liveRequests`, `cachedRequests`, `liveMs`, `billedTokens`, `tokensReported` | Per-model document/query batch statistics. `tokensReported` says whether all live batches in that category supplied usage counts. These records exclude preflight access checks and fresh latency samples. |
| `latency`, `samples`, `query`, `repeat`, `ms`, `p50`, `p95` | Fresh single-query timing observations, their query text, repetition number starting at zero, milliseconds, and summary percentiles. |
| `runs`, `documentModel`, `queryModel`, `scores` | Each tested document/query model pairing and its lexical, vector, or hybrid scores. |
| `overall`, `byKind`, `bySplit`, `count`, `hitRate`, `mrr` | Scores for all answerable questions, by category, or by original/additional subset. `count` is the answerable denominator; `hitRate` keys `1`, `3`, `5`, `10` hold fractions from 0 to 1. |
| `rows`, `kind`, `query`, `split` | Individual labeled test cases, their category, text, and subset. |
| `expect`, `expectGroups` | Acceptable document IDs, or groups of alternatives that must each be satisfied. `expectGroups` takes precedence when present. |
| `variant`, `readerSelection`, `focus` | Optional publication scope and reader-view selections. A variant identifies channel, version, and language; `focus` is one reader-filter dimension. |
| `rank`, `top`, `bestScore` | Expected-answer rank, first ten distinct result IDs, and the first passage's raw retrieval score. Raw scores use different scales across search modes and should not be compared as probabilities or accuracy percentages. |
| `comparisons`, `candidate`, `mode`, `delta`, `ci95`, `wins`, `losses`, `ties` | Paired comparisons against the baseline. `delta` and `ci95` use fractions in JSON: `0.02` means +2 percentage points. |
