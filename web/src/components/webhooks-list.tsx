import * as Dialog from "@radix-ui/react-dialog";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { webhookListSchema } from "../http/schemas/webhooks";
import { CodeBlock } from "./ui/code-block";
import { WebhooksListItem } from "./webhooks-list-item";

type GenerateResponse = { code: string };

export function WebhooksList() {
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const observerRef = useRef<IntersectionObserver>(null);

	const [generatedHandlerCode, setGeneratedHandlerCode] = useState<
		string | null
	>(null);

	const [checkedWebhooksIds, setCheckedWebhooksIds] = useState<string[]>([]);

	const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery({
			queryKey: ["webhooks"],
			queryFn: async ({ pageParam }) => {
				const url = new URL("http://localhost:3333/api/webhooks");

				if (pageParam) {
					url.searchParams.set("cursor", pageParam);
				}

				const response = await fetch(url);
				const data = await response.json();

				return webhookListSchema.parse(data);
			},
			getNextPageParam: (lastPage) => {
				return lastPage.nextCursor ?? undefined;
			},
			initialPageParam: undefined as string | undefined,
		});

	const webhooks = data.pages.flatMap((page) => page.webhooks);

	useEffect(() => {
		if (observerRef.current) {
			observerRef.current.disconnect();
		}

		observerRef.current = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];

				if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{
				threshold: 0.1,
			},
		);

		if (loadMoreRef.current) {
			observerRef.current.observe(loadMoreRef.current);
		}

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	function handleCheckWebhook(id: string) {
		if (checkedWebhooksIds.includes(id)) {
			setCheckedWebhooksIds((state) => {
				return state.filter((webhookId) => webhookId !== id);
			});
		} else {
			setCheckedWebhooksIds((state) => [...state, id]);
		}
	}

	const hasAnyWebhookChecked = checkedWebhooksIds.length > 0;

	async function handleGenerateHanlder() {
		const response = await fetch("http://localhost:3333/api/generate", {
			method: "POST",
			body: JSON.stringify({ webhooksIds: checkedWebhooksIds }),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data: GenerateResponse = await response.json();

		setGeneratedHandlerCode(data.code);
	}

	return (
		<>
			<div
				className={twMerge(
					"flex-1 overflow-y-auto",
					"[scrollbar-width:thin] [scrollbar-color:#4b5563_transparent]",
					"[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-zinc-600",
					"[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent",
				)}
			>
				<div className="space-y-1 p-2">
					<button
						type="button"
						disabled={!hasAnyWebhookChecked}
						className="bg-indigo-500 text-white w-full rounded-lg flex items-center justify-center gap-3 font-medium text-sm py-2 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={handleGenerateHanlder}
					>
						<Wand2 className="size-4" />
						Gerar handler
					</button>

					{webhooks.map((webhook) => {
						return (
							<WebhooksListItem
								key={webhook.id}
								webhook={webhook}
								onWebhookChecked={handleCheckWebhook}
								IsWebhookChecked={checkedWebhooksIds.includes(webhook.id)}
							/>
						);
					})}
				</div>

				{hasNextPage && (
					<div className="p-2" ref={loadMoreRef}>
						{isFetchingNextPage && (
							<div className="flex items-center justify-center py-2">
								<Loader2 className="size-5 animate-spin text-zinc-500" />
							</div>
						)}
					</div>
				)}
			</div>

			{!!generatedHandlerCode && (
				<Dialog.Root defaultOpen>
					<Dialog.Overlay className="bg-black/60 inset-0 fixed z-20" />

					<Dialog.Content className="flex items-center justify-center fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 z-40">
						<div className="bg-zinc-900 w-[800px] p-4 rounded-lg border border-zinc-800 max-h-[620px] overflow-y-auto">
							<CodeBlock language="typescript" code={generatedHandlerCode} />
						</div>
					</Dialog.Content>
				</Dialog.Root>
			)}
		</>
	);
}
