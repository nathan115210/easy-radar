import { Anchor, Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSources } from "../api/client.js";
import { CATEGORY_LABELS } from "../domain/category-labels.js";
import type {
  CategorySources,
  MonitoredSourceView,
  ReferenceSourceView,
} from "../../shared/schemas/index.js";

const route = getRouteApi("/sources");

const STATUS_LABEL: Record<MonitoredSourceView["status"], string> = {
  active: "Active",
  failing: "Failing",
  planned: "Planned",
};

/**
 * Same red/orange-via-`warning` convention as `CollectionStatusAlert`
 * (PRD §14.2's fixed five theme seeds, no default Mantine red/green):
 * failing is the filled, high-contrast form of `warning`; planned is its
 * light form; active uses the accent/success seed.
 */
const STATUS_STYLE: Record<
  MonitoredSourceView["status"],
  { color: string; variant: "filled" | "light" }
> = {
  active: { color: "accent", variant: "light" },
  failing: { color: "warning", variant: "filled" },
  planned: { color: "warning", variant: "light" },
};

function formatTimestamp(iso: string | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "Never";
}

function MonitoredSourceRow({
  source,
  highlighted,
}: {
  source: MonitoredSourceView;
  highlighted: boolean;
}) {
  const style = STATUS_STYLE[source.status];
  return (
    <Card
      id={`source-${source.id}`}
      withBorder
      padding="sm"
      bg={highlighted ? "surface.2" : undefined}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={2}>
          <Anchor href={source.url} target="_blank" rel="noopener noreferrer" fw={600}>
            {source.name}
          </Anchor>
          <Text size="xs" c="dimmed">
            {source.kind}
          </Text>
        </Stack>
        <Badge color={style.color} variant={style.variant}>
          {STATUS_LABEL[source.status]}
        </Badge>
      </Group>
      <Stack gap={2} mt="xs">
        <Text size="xs" c="dimmed">
          Last success: {formatTimestamp(source.lastSuccessAt)}
        </Text>
        <Text size="xs" c="dimmed">
          Last attempt: {formatTimestamp(source.lastAttemptAt)}
        </Text>
        {source.failureReason && (
          <Text size="xs" c="warning">
            {source.failureReason}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function ReferenceSourceRow({ source }: { source: ReferenceSourceView }) {
  return (
    <Card withBorder padding="sm">
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={2}>
          <Anchor href={source.url} target="_blank" rel="noopener noreferrer" fw={600}>
            {source.name}
          </Anchor>
          {source.note && (
            <Text size="xs" c="dimmed">
              {source.note}
            </Text>
          )}
        </Stack>
        <Badge color="primary" variant="light">
          Not collected
        </Badge>
      </Group>
    </Card>
  );
}

function CategorySection({
  data,
  highlightSourceId,
}: {
  data: CategorySources;
  highlightSourceId: string | undefined;
}) {
  return (
    <Stack id={`category-${data.category}`} gap="sm">
      <Title order={2}>{CATEGORY_LABELS[data.category]}</Title>
      <Text size="sm" c="dimmed">
        {data.coverage.active} / {data.coverage.total} Active · Failing: {data.coverage.failing} ·
        Planned: {data.coverage.planned}
      </Text>

      <Title order={3} fz="md">
        Monitored sources
      </Title>
      {data.monitored.length === 0 ? (
        <Text size="sm" c="dimmed">
          No monitored sources yet.
        </Text>
      ) : (
        <Stack gap="xs">
          {data.monitored.map((source) => (
            <MonitoredSourceRow
              key={source.id}
              source={source}
              highlighted={source.id === highlightSourceId}
            />
          ))}
        </Stack>
      )}

      <Title order={3} fz="md">
        Reference only
      </Title>
      {data.referenceOnly.length === 0 ? (
        <Text size="sm" c="dimmed">
          None.
        </Text>
      ) : (
        <Stack gap="xs">
          {data.referenceOnly.map((source) => (
            <ReferenceSourceRow key={source.id} source={source} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/**
 * The read-only Sources page (PRD §6.4): every category, always, each
 * with its coverage counts and its monitored/reference-only sources —
 * reading the same `/api/sources` join the main-page alert (#19) reads,
 * which itself joins the collector's own TypeScript source config with
 * runtime status, so this can never drift from what the collector
 * actually has configured. Deliberately no add/edit/delete/disable
 * control anywhere: source changes are TypeScript config and reviewed
 * code, not a page action (PRD §7.4).
 */
export function SourcesPage() {
  const { category: highlightCategory, sourceId: highlightSourceId } = route.useSearch();
  const { data, isPending, isError } = useQuery({ queryKey: ["sources"], queryFn: getSources });

  useEffect(() => {
    if (!data) return;
    const targetId = highlightSourceId
      ? `source-${highlightSourceId}`
      : highlightCategory
        ? `category-${highlightCategory}`
        : undefined;
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data, highlightCategory, highlightSourceId]);

  return (
    <Stack gap="xl" p="md">
      <Title order={1}>Sources</Title>
      {isError && <Text c="red">Failed to load sources.</Text>}
      {isPending && <Text c="dimmed">Loading…</Text>}
      {data?.categories.map((categoryData) => (
        <CategorySection
          key={categoryData.category}
          data={categoryData}
          highlightSourceId={highlightSourceId}
        />
      ))}
    </Stack>
  );
}
