import { Alert, Anchor, Group, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getCollectionStatus, getSources } from "../api/client.js";
import { findDeepLinkTarget, getAlertTitle, getSeverity } from "../domain/collection-alert.js";

/**
 * Icon + color choices are deliberately constrained to the app's five
 * theme seeds (PRD §14.2: "Default Mantine blue/red/green palettes are
 * not introduced"), none of which is a dedicated "danger" red. Red and
 * orange therefore both use the `warning` seed, told apart primarily by
 * icon/text/weight (a filled octagon vs. a light triangle) rather than by
 * color alone — the same "status communication uses text and an icon as
 * well as color" rule the theme doc states.
 */
const SEVERITY_STYLE = {
  red: { color: "warning", variant: "filled" as const, icon: "⛔" },
  orange: { color: "warning", variant: "light" as const, icon: "⚠️" },
  green: { color: "accent", variant: "light" as const, icon: "✅" },
};

/**
 * The main-page collection status alert (PRD §7.1) — the user's primary
 * failure channel for cloud collection runs, since they read
 * `data/collection-status.json` rather than anything local-only. Red
 * (failing sources or a rejected run) always outranks orange (planned
 * sources or staleness), which outranks a compact green success state
 * (see `getSeverity`). There is deliberately no dismiss control anywhere
 * here: red/orange alerts only go away once `/api/collection-status`
 * itself reports a healthy state.
 */
export function CollectionStatusAlert() {
  const statusQuery = useQuery({
    queryKey: ["collection-status"],
    queryFn: getCollectionStatus,
  });
  const sourcesQuery = useQuery({ queryKey: ["sources"], queryFn: getSources });

  if (statusQuery.isPending || statusQuery.isError) {
    return null;
  }

  const status = statusQuery.data;
  const severity = getSeverity(status);
  const style = SEVERITY_STYLE[severity];
  const categories = sourcesQuery.data?.categories ?? [];
  const deepLink = findDeepLinkTarget(status, categories, severity);
  const lastRunAt = new Date(status.lastRunAt).toLocaleString();

  if (severity === "green") {
    return (
      <Alert
        role="alert"
        color={style.color}
        variant={style.variant}
        icon={style.icon}
        title={getAlertTitle(status, severity)}
      >
        <Group justify="space-between">
          <Text size="sm">
            {status.coverage.succeeded} / {status.coverage.total} Active · Last collection:{" "}
            {lastRunAt}
          </Text>
          <Link to="/sources" search={deepLink}>
            <Anchor component="span" size="sm">
              View sources
            </Anchor>
          </Link>
        </Group>
      </Alert>
    );
  }

  return (
    <Alert
      role="alert"
      color={style.color}
      variant={style.variant}
      icon={style.icon}
      title={getAlertTitle(status, severity)}
    >
      <Stack gap={4}>
        <Text size="sm">
          Coverage: {status.coverage.succeeded} / {status.coverage.total} Active
        </Text>
        <Text size="sm">
          Failing: {status.coverage.failed} · Planned: {status.coverage.planned}
        </Text>
        <Text size="sm">Last collection: {lastRunAt}</Text>
        <Link to="/sources" search={deepLink}>
          <Anchor component="span" size="sm">
            View sources
          </Anchor>
        </Link>
      </Stack>
    </Alert>
  );
}
