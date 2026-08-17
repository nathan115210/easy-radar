import { Badge, Button, Card, Group, Modal, Stack, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type MouseEvent } from "react";
import { setNewsState } from "../api/client.js";
import { CATEGORY_LABELS } from "../domain/category-labels.js";
import type { NewsItemView, NewsPageResponse, NewsStateValue } from "../../shared/schemas/index.js";

type NewsCardProps = {
  item: NewsItemView;
  /** The `["news", category, state, page]` key of the list this card renders in. */
  queryKey: readonly unknown[];
};

/**
 * A single news item (PRD §6.2). The whole card is an anchor to the
 * original link and opens in a new tab; every state action stops that
 * navigation so clicking a button never follows the link. `ignored` goes
 * through a confirmation modal first, since it's the one action that
 * deletes the item from active news (PRD §10) rather than just relabeling
 * it. The mutation applies optimistically to this card's own list query
 * and rolls back on failure; `onSettled` invalidates every `news` query so
 * counts and other state-filter views reconcile with the server afterward.
 */
export function NewsCard({ item, queryKey }: NewsCardProps) {
  const queryClient = useQueryClient();
  const [confirmIgnoreOpen, setConfirmIgnoreOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (state: NewsStateValue) => setNewsState(item.id, state),
    onMutate: async (state) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NewsPageResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<NewsPageResponse>(queryKey, {
          ...previous,
          items:
            state === "ignored"
              ? previous.items.filter((candidate) => candidate.id !== item.id)
              : previous.items.map((candidate) =>
                  candidate.id === item.id ? { ...candidate, state } : candidate,
                ),
        });
      }
      return { previous };
    },
    onError: (_error, _state, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });

  function stopNavigation(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleIgnoreConfirm() {
    setConfirmIgnoreOpen(false);
    mutation.mutate("ignored");
  }

  return (
    <>
      <Card
        component="a"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        withBorder
        padding="md"
        bg={item.state === "read" ? "secondary-surface.1" : undefined}
      >
        <Stack gap="xs">
          <Text fw={600}>{item.heading}</Text>

          <Group gap="xs">
            <Badge variant="light" color="primary">
              {CATEGORY_LABELS[item.category]}
            </Badge>
            <Badge variant="outline" color="accent">
              {item.label}
            </Badge>
            {item.tags.map((tag) => (
              <Badge key={tag} variant="dot" color="primary">
                {tag}
              </Badge>
            ))}
            {item.state === "read" && (
              <Badge variant="filled" color="secondary-surface">
                Read
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            {item.state === "unread" ? (
              <Button
                size="xs"
                variant="light"
                loading={mutation.isPending && mutation.variables === "read"}
                onClick={(event) => {
                  stopNavigation(event);
                  mutation.mutate("read");
                }}
              >
                Mark as read
              </Button>
            ) : (
              <Button
                size="xs"
                variant="light"
                loading={mutation.isPending && mutation.variables === "unread"}
                onClick={(event) => {
                  stopNavigation(event);
                  mutation.mutate("unread");
                }}
              >
                Mark as unread
              </Button>
            )}
            <Button
              size="xs"
              variant="light"
              color="warning"
              onClick={(event) => {
                stopNavigation(event);
                setConfirmIgnoreOpen(true);
              }}
            >
              Ignore
            </Button>
          </Group>

          {mutation.isError && (
            <Text c="red" size="sm">
              Failed to update state. Please try again.
            </Text>
          )}
        </Stack>
      </Card>

      <Modal
        opened={confirmIgnoreOpen}
        onClose={() => setConfirmIgnoreOpen(false)}
        title="Ignore this item?"
      >
        <Stack gap="md">
          <Text size="sm">
            This removes &ldquo;{item.heading}&rdquo; from your active news list. It won&apos;t
            reappear even if it&apos;s collected again.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmIgnoreOpen(false)}>
              Cancel
            </Button>
            <Button color="warning" onClick={handleIgnoreConfirm}>
              Ignore
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
