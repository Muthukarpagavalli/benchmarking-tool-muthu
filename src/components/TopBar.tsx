export default function TopBar({
  title,
  stats,
}: {
  title: string;
  stats: { categories: number; tools: number; peerFirms: number; sightings: number };
}) {
  return (
    <div className="top-bar">
      <span className="top-bar-title">{title}</span>
      <div className="top-bar-stats">
        <span>{stats.categories} categories</span>
        <span>{stats.tools} tools tracked</span>
        <span>{stats.peerFirms} peer firms</span>
        <span>{stats.sightings} sightings logged</span>
      </div>
    </div>
  );
}
