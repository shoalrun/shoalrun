// A language-neutral view of one API request, plus serializers that turn it into
// copyable code samples. The HTML reference shows every language; the Markdown
// twin and the agent bundle keep only the cURL sample by deliberate choice,
// because agents can translate cURL and one canonical sample keeps the .md
// output small. See docs/content/api-generation.mdx.

export type CodeSample = { language: string; label: string; highlight: string; code: string };

export type RequestAuth =
  | { kind: 'header'; name: string; value: string }
  | { kind: 'cookie'; name: string; value: string }
  | { kind: 'basic'; user: string; pass: string }
  | { kind: 'digest'; user: string; pass: string }
  | { kind: 'bearer'; token: string }
  | { kind: 'authorization'; value: string }
  | { kind: 'mtls'; cert: string; key: string };

export type RequestBody = { mediaType: string; text: string; formFields: string[] };

export type RequestSample = {
  method: string;
  url: string;
  headers: Array<{ name: string; value: string }>;
  auth: RequestAuth[];
  contentType?: string;
  body?: RequestBody;
};

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const phpString = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const rubyString = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const csharpString = (value: string) => `@"${value.replaceAll('"', '""')}"`;
const goString = (value: string) => value.includes('`') ? JSON.stringify(value) : '`' + value + '`';
const basicHeader = 'Basic <base64 of YOUR_USERNAME:YOUR_PASSWORD>';

type Resolved = { headers: Array<[string, string]>; notes: string[] };
function resolve(sample: RequestSample): Resolved {
  const headers: Array<[string, string]> = [];
  const cookies: string[] = [];
  const notes: string[] = [];
  for (const auth of sample.auth) {
    if (auth.kind === 'header') headers.push([auth.name, auth.value]);
    else if (auth.kind === 'cookie') cookies.push(`${auth.name}=${auth.value}`);
    else if (auth.kind === 'bearer') headers.push(['Authorization', `Bearer ${auth.token}`]);
    else if (auth.kind === 'authorization') headers.push(['Authorization', auth.value]);
    else if (auth.kind === 'basic') headers.push(['Authorization', basicHeader]);
    else if (auth.kind === 'digest') notes.push('HTTP digest auth answers the server challenge with YOUR_USERNAME and YOUR_PASSWORD; most clients handle it for you.');
    else if (auth.kind === 'mtls') notes.push('Mutual TLS: present CLIENT_CERT.pem and use CLIENT_KEY.pem.');
  }
  if (cookies.length) headers.push(['Cookie', cookies.join('; ')]);
  for (const header of sample.headers) headers.push([header.name, header.value]);
  if (sample.contentType && !headers.some(([name]) => name.toLowerCase() === 'content-type')) headers.push(['Content-Type', sample.contentType]);
  return { headers, notes };
}
const isHead = (sample: RequestSample): boolean => sample.method.toUpperCase() === 'HEAD';
const hasBody = (sample: RequestSample): boolean => !!sample.body && !sample.body.formFields.length;

function curl(sample: RequestSample): string {
  const parts = [isHead(sample) ? 'curl --head' : `curl --request ${sample.method.toUpperCase()}`, `--url ${shellQuote(sample.url)}`];
  for (const auth of sample.auth) {
    if (auth.kind === 'header') parts.push(`--header ${shellQuote(`${auth.name}: ${auth.value}`)}`);
    else if (auth.kind === 'cookie') parts.push(`--header ${shellQuote(`Cookie: ${auth.name}=${auth.value}`)}`);
    else if (auth.kind === 'basic') parts.push(`--user ${shellQuote(`${auth.user}:${auth.pass}`)}`);
    else if (auth.kind === 'digest') parts.push('--digest', `--user ${shellQuote(`${auth.user}:${auth.pass}`)}`);
    else if (auth.kind === 'authorization') parts.push(`--header ${shellQuote(`Authorization: ${auth.value}`)}`);
    else if (auth.kind === 'bearer') parts.push(`--header ${shellQuote(`Authorization: Bearer ${auth.token}`)}`);
    else if (auth.kind === 'mtls') parts.push(`--cert ${shellQuote(auth.cert)}`, `--key ${shellQuote(auth.key)}`);
  }
  for (const header of sample.headers) parts.push(`--header ${shellQuote(`${header.name}: ${header.value}`)}`);
  if (sample.contentType && !sample.body?.formFields.length) parts.push(`--header ${shellQuote(`Content-Type: ${sample.contentType}`)}`);
  for (const field of sample.body?.formFields ?? []) parts.push(`--form ${shellQuote(`${field}=@YOUR_${field.replace(/[^a-z0-9]/gi, '_').toUpperCase()}`)}`);
  if (hasBody(sample)) parts.push(`--data-raw ${shellQuote(sample.body!.text)}`);
  return parts.join(' \\\n  ');
}

function javascript(sample: RequestSample, node: boolean): string {
  const { headers, notes } = resolve(sample);
  const options = [`  method: ${JSON.stringify(sample.method.toUpperCase())}`];
  if (headers.length) options.push(`  headers: {\n${headers.map(([name, value]) => `    ${JSON.stringify(name)}: ${JSON.stringify(value)}`).join(',\n')}\n  }`);
  if (hasBody(sample)) options.push(`  body: ${JSON.stringify(sample.body!.text)}`);
  const lines = notes.map(note => `// ${note}`);
  if (node) lines.push('// Node.js 18 or newer provides a global fetch.');
  lines.push(`const response = await fetch(${JSON.stringify(sample.url)}, {`, options.join(',\n'), '});', '');
  if (isHead(sample)) lines.push('console.log(response.status, Object.fromEntries(response.headers));');
  else lines.push('const body = await response.text();', "const mediaType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();", "const data = body && (mediaType === 'application/json' || mediaType.endsWith('+json')) ? JSON.parse(body) : body;", 'console.log(data);');
  return lines.join('\n');
}

function python(sample: RequestSample): string {
  const { headers, notes } = resolve(sample);
  const lines = ['import requests', '', ...notes.map(note => `# ${note}`), `url = ${JSON.stringify(sample.url)}`];
  if (headers.length) lines.push(`headers = {\n${headers.map(([name, value]) => `    ${JSON.stringify(name)}: ${JSON.stringify(value)}`).join(',\n')}\n}`);
  if (hasBody(sample)) lines.push(`data = ${JSON.stringify(sample.body!.text)}`);
  const args = ['url', ...(headers.length ? ['headers=headers'] : []), ...(hasBody(sample) ? ['data=data'] : [])];
  lines.push('', `response = requests.${sample.method.toLowerCase()}(${args.join(', ')})`);
  if (isHead(sample)) lines.push('print(response.status_code, dict(response.headers))');
  else lines.push('body = response.text', "media_type = response.headers.get('Content-Type', '').split(';')[0].strip().lower()", "data = response.json() if body and (media_type == 'application/json' or media_type.endswith('+json')) else body", 'print(data)');
  return lines.join('\n');
}

function go(sample: RequestSample): string {
  const { headers, notes } = resolve(sample);
  const imports = ['"fmt"', ...(isHead(sample) ? [] : ['"io"']), '"net/http"', ...(hasBody(sample) ? ['"strings"'] : [])].sort();
  const bodyVar = hasBody(sample) ? [`body := strings.NewReader(${goString(sample.body!.text)})`, ''] : [];
  const bodyArg = hasBody(sample) ? 'body' : 'nil';
  const lines = [
    ...notes.map(note => `// ${note}`),
    'package main', '', 'import (', ...imports.map(item => `\t${item}`), ')', '',
    'func main() {', ...bodyVar.map(line => line ? `\t${line}` : ''),
    `\treq, err := http.NewRequest(${JSON.stringify(sample.method.toUpperCase())}, ${JSON.stringify(sample.url)}, ${bodyArg})`,
    '\tif err != nil {', '\t\tpanic(err)', '\t}',
    ...headers.map(([name, value]) => `\treq.Header.Set(${JSON.stringify(name)}, ${JSON.stringify(value)})`),
    '\tres, err := http.DefaultClient.Do(req)', '\tif err != nil {', '\t\tpanic(err)', '\t}',
    '\tdefer res.Body.Close()', ...(isHead(sample) ? ['\tfmt.Println(res.StatusCode, res.Header)'] : ['\tdata, err := io.ReadAll(res.Body)', '\tif err != nil {', '\t\tpanic(err)', '\t}', '\tfmt.Println(string(data))']), '}'
  ];
  return lines.join('\n');
}

function java(sample: RequestSample): string {
  const { headers, notes } = resolve(sample);
  const builder = headers.map(([name, value]) => `            .header(${JSON.stringify(name)}, ${JSON.stringify(value)})`);
  const bodyMethod = hasBody(sample) ? `            .method(${JSON.stringify(sample.method.toUpperCase())}, HttpRequest.BodyPublishers.ofString(${JSON.stringify(sample.body!.text)}))` : `            .method(${JSON.stringify(sample.method.toUpperCase())}, HttpRequest.BodyPublishers.noBody())`;
  return [
    ...notes.map(note => `// ${note}`),
    'import java.net.URI;', 'import java.net.http.HttpClient;', 'import java.net.http.HttpRequest;', 'import java.net.http.HttpResponse;', '',
    'public class Main {', '    public static void main(String[] args) throws Exception {', '        HttpClient client = HttpClient.newHttpClient();',
    '        HttpRequest request = HttpRequest.newBuilder()', `            .uri(URI.create(${JSON.stringify(sample.url)}))`, ...builder, bodyMethod, '            .build();',
    '        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());', ...(isHead(sample) ? ['        System.out.println(response.statusCode());', '        System.out.println(response.headers().map());'] : ['        System.out.println(response.body());']), '    }', '}'
  ].join('\n');
}

function php(sample: RequestSample): string {
  const { headers, notes } = resolve(sample);
  const array = ['    CURLOPT_URL => ' + phpString(sample.url), `    CURLOPT_CUSTOMREQUEST => ${phpString(sample.method.toUpperCase())}`, '    CURLOPT_RETURNTRANSFER => true'];
  if (isHead(sample)) array.push('    CURLOPT_NOBODY => true', '    CURLOPT_HEADER => true');
  if (headers.length) array.push(`    CURLOPT_HTTPHEADER => [\n${headers.map(([name, value]) => `        ${phpString(`${name}: ${value}`)}`).join(',\n')}\n    ]`);
  if (hasBody(sample)) array.push(['    CURLOPT_POSTFIELDS => <<<\'JSON\'', sample.body!.text, 'JSON'].join('\n'));
  return [
    '<?php', '',
    ...notes.map(note => `// ${note}`),
    '$ch = curl_init();', 'curl_setopt_array($ch, [', array.join(',\n'), ']);', '',
    '$response = curl_exec($ch);', 'curl_close($ch);', 'echo $response;'
  ].join('\n');
}

function ruby(sample: RequestSample): string {
  const { headers, notes } = resolve(sample);
  const method = sample.method.toLowerCase();
  const klass = method[0].toUpperCase() + method.slice(1);
  const lines = [
    ...notes.map(note => `# ${note}`),
    "require 'net/http'", "require 'uri'", '',
    `uri = URI(${rubyString(sample.url)})`, 'http = Net::HTTP.new(uri.host, uri.port)', 'http.use_ssl = uri.scheme == \'https\'', '',
    `request = Net::HTTP::${klass}.new(uri)`,
    ...headers.map(([name, value]) => `request[${rubyString(name)}] = ${rubyString(value)}`),
    ...(hasBody(sample) ? [`request.body = ${rubyString(sample.body!.text)}`] : []),
    '', 'response = http.request(request)', ...(isHead(sample) ? ['puts response.code', 'puts response.to_hash'] : ['puts response.body'])
  ];
  return lines.join('\n');
}

function csharp(sample: RequestSample): string {
  const { headers, notes } = resolve(sample);
  const contentHeaders = headers.filter(([name]) => name.toLowerCase() !== 'content-type');
  const contentType = headers.find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? sample.body?.mediaType ?? 'application/json';
  return [
    ...notes.map(note => `// ${note}`),
    'using System;', 'using System.Net.Http;', 'using System.Text;', 'using System.Threading.Tasks;', '',
    'class Program', '{', '    static async Task Main()', '    {', '        using var client = new HttpClient();',
    `        var request = new HttpRequestMessage(new HttpMethod(${JSON.stringify(sample.method.toUpperCase())}), ${JSON.stringify(sample.url)});`,
    ...contentHeaders.map(([name, value]) => `        request.Headers.TryAddWithoutValidation(${JSON.stringify(name)}, ${JSON.stringify(value)});`),
    ...(hasBody(sample) ? [`        request.Content = new StringContent(${csharpString(sample.body!.text)}, Encoding.UTF8, ${JSON.stringify(contentType)});`] : []),
    '        var response = await client.SendAsync(request);', ...(isHead(sample) ? ['        Console.WriteLine((int)response.StatusCode);', '        Console.WriteLine(response.Headers);', '        Console.WriteLine(response.Content.Headers);'] : ['        Console.WriteLine(await response.Content.ReadAsStringAsync());']), '    }', '}'
  ].join('\n');
}

// cURL comes first: the Markdown twin and agent bundle keep only that one.
export function requestSamples(sample: RequestSample): CodeSample[] {
  const curlSample: CodeSample = { language: 'curl', label: 'cURL', highlight: 'bash', code: curl(sample) };
  if (sample.body?.formFields.length) return [curlSample];
  return [
    curlSample,
    { language: 'javascript', label: 'JavaScript', highlight: 'javascript', code: javascript(sample, false) },
    { language: 'node', label: 'Node.js', highlight: 'javascript', code: javascript(sample, true) },
    { language: 'python', label: 'Python', highlight: 'python', code: python(sample) },
    { language: 'go', label: 'Go', highlight: 'go', code: go(sample) },
    { language: 'java', label: 'Java', highlight: 'java', code: java(sample) },
    { language: 'php', label: 'PHP', highlight: 'php', code: php(sample) },
    { language: 'ruby', label: 'Ruby', highlight: 'ruby', code: ruby(sample) },
    { language: 'csharp', label: 'C#', highlight: 'csharp', code: csharp(sample) }
  ];
}
