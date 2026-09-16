import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { privacyPolicyContent } from '../data/privacy';

// Simple markdown-like rendering for content
function renderContent(content) {
  // Handle bold text
  let rendered = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Handle inline code
  rendered = rendered.replace(
    /`([^`]+)`/g,
    '<code class="border border-white/15 px-1 py-0.5 rounded text-accent text-sm">$1</code>'
  );

  // Handle links
  rendered = rendered.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">$1</a>'
  );

  // Handle lists (simple implementation)
  const lines = rendered.split('\n');
  let inList = false;
  let listItems = [];
  let result = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(trimmed.substring(2));
    } else {
      if (inList) {
        result.push(
          `<ul class="list-disc list-inside space-y-1 text-white/60">${listItems
            .map((item) => `<li>${item}</li>`)
            .join('')}</ul>`
        );
        inList = false;
        listItems = [];
      }
      if (trimmed.match(/^\d+\.\s/)) {
        // Numbered list
        const text = trimmed.replace(/^\d+\.\s/, '');
        if (index > 0 && !lines[index - 1].trim().match(/^\d+\.\s/)) {
          result.push(
            '<ol class="list-decimal list-inside space-y-1 text-white/60">'
          );
        }
        result.push(`<li>${text}</li>`);
        if (
          index === lines.length - 1 ||
          !lines[index + 1]?.trim().match(/^\d+\.\s/)
        ) {
          result.push('</ol>');
        }
      } else if (trimmed) {
        result.push(`<p class="text-white/60 leading-relaxed">${trimmed}</p>`);
      }
    }
  });

  if (inList) {
    result.push(
      `<ul class="list-disc list-inside space-y-1 text-white/60">${listItems
        .map((item) => `<li>${item}</li>`)
        .join('')}</ul>`
    );
  }

  return result.join('');
}

// Handle tables in content
function renderTable(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  const tableMatch = lines.some((l) => l.includes('|'));

  if (!tableMatch) {
    return (
      <div
        className="space-y-4"
        dangerouslySetInnerHTML={{ __html: renderContent(content) }}
      />
    );
  }

  // Parse table
  const tableLines = lines.filter((l) => l.includes('|'));
  const rows = tableLines.map((line) =>
    line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell && !cell.match(/^-+$/))
  );

  // First row is header
  const [header, ...body] = rows.filter((row) => row.length > 0);

  const beforeTable = content.split('|')[0].trim();
  const afterTableIndex = content.lastIndexOf('|');
  const afterTable = content
    .substring(afterTableIndex)
    .split('\n')
    .slice(1)
    .join('\n')
    .trim();

  return (
    <div className="space-y-4">
      {beforeTable && (
        <div dangerouslySetInnerHTML={{ __html: renderContent(beforeTable) }} />
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-white/15 rounded-lg overflow-hidden">
          <thead className="bg-black">
            <tr>
              {header?.map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/15"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} className="border-b border-white/15 last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-3 text-sm text-white/60"
                    dangerouslySetInnerHTML={{ __html: renderContent(cell) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {afterTable && (
        <div dangerouslySetInnerHTML={{ __html: renderContent(afterTable) }} />
      )}
    </div>
  );
}

function Privacy() {
  // Scroll to top on mount and give the route its own document head
  useEffect(() => {
    window.scrollTo(0, 0);
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    document.title = 'Privacy Policy — FocusPaw';
    meta?.setAttribute(
      'content',
      'FocusPaw privacy policy: all tracking data stays in local extension storage. No accounts, no telemetry, no cloud sync.'
    );
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription) {
        meta.setAttribute('content', previousDescription);
      }
    };
  }, []);

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {privacyPolicyContent.title}
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Last Updated: {privacyPolicyContent.lastUpdated}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10">
          {privacyPolicyContent.sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-xl font-semibold text-white mb-4">
                {section.title}
              </h2>
              {renderTable(section.content)}
            </section>
          ))}

          {/* Summary Table */}
          <section id="summary">
            <h2 className="text-xl font-semibold text-white mb-4">
              {privacyPolicyContent.summary.title}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-white/15 rounded-lg overflow-hidden">
                <thead className="bg-black">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/15">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/15">
                      Answer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {privacyPolicyContent.summary.items.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/15 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm text-white/60">
                        {item.question}
                      </td>
                      <td className="px-4 py-3 text-sm text-accent font-medium">
                        {item.answer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer message */}
          <div className="text-center pt-8 border-t border-white/15">
            <p className="text-white/60">
              <strong className="text-white">FocusPaw</strong> — Track your
              focus, privacy-first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
