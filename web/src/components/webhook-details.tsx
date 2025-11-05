import { useSuspenseQuery } from "@tanstack/react-query";
import { twMerge } from "tailwind-merge";
import { webhookDetailSchema } from "../http/schemas/webhooks";
import { SectionDataTable } from "./section-data-table";
import { SectionTitle } from "./section-title";
import { CodeBlock } from "./ui/code-block";
import { WebhookDetailHeader } from "./webhook-detail-header";

interface WebhookDetailsProps {
	id: string;
}

export function WebhookDetails({ id }: WebhookDetailsProps) {
	const { data } = useSuspenseQuery({
		queryKey: ["webhook", id],
		queryFn: async () => {
			const response = await fetch(`http://localhost:3333/api/webhooks/${id}`);
			const data = await response.json();

			return webhookDetailSchema.parse(data);
		},
	});

	const overviewData = [
		{ key: "Method", value: data.method },
		{ key: "Status Code", value: String(data.statusCode) },
		{ key: "Content-Type", value: data.contentType || "application/json" },
		{ key: "Content-Lenght", value: `${data.contentLength || 0} bytes` },
	];

	const headers = Object.entries(data.headers).map(([key, value]) => {
		return { key, value: String(value) };
	});

	const queryParams = Object.entries(data.queryParams || {}).map(
		([key, value]) => {
			return { key, value: String(value) };
		},
	);

	return (
		<div className="flex h-full flex-col">
			<WebhookDetailHeader
				method={data.method}
				createdAt={data.createdAt}
				ip={data.ip}
				pathname={data.pathname}
			/>

			<div
				className={twMerge(
					"flex-1 overflow-y-auto",
					"[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent",
					"[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-zinc-600",
					"[scrollbar-width:thin] [scrollbar-color:#4b5563_transparent]",
				)}
			>
				<div className="space-y-6 p-6">
					<div className="space-y-4">
						<SectionTitle>Request Overview</SectionTitle>

						<SectionDataTable data={overviewData} />
					</div>

					<div className="space-y-4">
						<SectionTitle>Headers</SectionTitle>

						<SectionDataTable data={headers} />
					</div>

					{queryParams.length > 0 && (
						<div className="space-y-4">
							<SectionTitle>Query Params</SectionTitle>

							<SectionDataTable data={queryParams} />
						</div>
					)}

					{!!data.body && (
						<div className="space-y-4">
							<SectionTitle>Request Body</SectionTitle>

							<CodeBlock code={data.body} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
