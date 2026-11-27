import type { ReactNode } from "react";

// The report is short Markdown from a fixed template or from Gemini. This reads
// only what both produce: headings, lists, tables, rules and bold text.

type Block =
	| { id: number; kind: "h1" | "h2" | "note" | "p"; text: string }
	| { id: number; kind: "list"; items: string[] }
	| { id: number; kind: "table"; rows: string[][] };

function parseMarkdown(markdown: string): Block[] {
	const blocks: Block[] = [];
	let id = 0;
	for (const raw of markdown.split("\n")) {
		const line = raw.trim();
		const last = blocks[blocks.length - 1];
		if (!line || /^-{3,}$/.test(line)) continue;
		if (line.startsWith("# ")) {
			blocks.push({ id: id++, kind: "h1", text: line.slice(2) });
		} else if (/^#{2,}\s/.test(line)) {
			blocks.push({ id: id++, kind: "h2", text: line.replace(/^#+\s/, "") });
		} else if (/^[-*]\s/.test(line)) {
			if (last?.kind === "list") last.items.push(line.slice(2));
			else blocks.push({ id: id++, kind: "list", items: [line.slice(2)] });
		} else if (line.startsWith("|")) {
			if (/^\|[\s:|-]+\|$/.test(line)) continue;
			const cells = line
				.slice(1, -1)
				.split("|")
				.map((cell) => cell.trim());
			if (last?.kind === "table") last.rows.push(cells);
			else blocks.push({ id: id++, kind: "table", rows: [cells] });
		} else if (/^_.+_$/.test(line)) {
			blocks.push({ id: id++, kind: "note", text: line.slice(1, -1) });
		} else {
			blocks.push({ id: id++, kind: "p", text: line });
		}
	}
	return blocks;
}

function inline(text: string): ReactNode[] {
	let offset = 0;
	return text
		.split(/(\*\*[^*]+\*\*)/)
		.filter(Boolean)
		.map((part) => {
			const key = offset;
			offset += part.length;
			return part.startsWith("**") ? (
				<strong key={key} className="text-[var(--ink)]">
					{part.slice(2, -2)}
				</strong>
			) : (
				part
			);
		});
}

/** Read-only preview of the report Markdown (headings, lists, tables, bold). */
export function ReportPreview({ markdown }: { markdown: string }) {
	return (
		<div className="flex flex-col gap-3 text-sm leading-6 text-[var(--ink-muted)]">
			{parseMarkdown(markdown).map((block) => {
				switch (block.kind) {
					case "h1":
						return (
							<p key={block.id} className="q-h3 text-[var(--ink)]">
								{inline(block.text)}
							</p>
						);
					case "h2":
						return (
							<h4 key={block.id} className="q-h3 mt-2 text-[var(--ink)]">
								{inline(block.text)}
							</h4>
						);
					case "note":
						return (
							<p key={block.id} className="q-sm italic">
								{inline(block.text)}
							</p>
						);
					case "list":
						return (
							<ul key={block.id} className="list-disc space-y-1 pl-5">
								{block.items.map((item) => (
									<li key={item}>{inline(item)}</li>
								))}
							</ul>
						);
					case "table": {
						const [head, ...rows] = block.rows;
						return (
							<div key={block.id} className="q-scroll overflow-x-auto">
								<table className="w-full min-w-[420px] border-collapse text-left text-sm">
									<thead>
										<tr>
											{head.map((cell) => (
												<th
													key={cell}
													scope="col"
													className="border-b border-[var(--line)] py-2 pr-3 font-semibold text-[var(--ink)]"
												>
													{cell}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{rows.map((row) => (
											<tr key={row.join("|")}>
												{row.map((cell, column) => (
													<td
														key={`${head[column] ?? column}-${cell}`}
														className="border-b border-[var(--line)] py-2 pr-3 tabular-nums"
													>
														{cell}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						);
					}
					default:
						return <p key={block.id}>{inline(block.text)}</p>;
				}
			})}
		</div>
	);
}
