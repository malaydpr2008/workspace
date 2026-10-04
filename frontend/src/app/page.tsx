import { WorkspaceShell } from '@/components/WorkspaceShell';
import { fetchWorkspaces } from '@/lib/api';

interface PageProps {
  searchParams?: Promise<{
    slug?: string;
    workspace?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  let targetSlug = resolvedSearchParams.slug || resolvedSearchParams.workspace;

  if (!targetSlug) {
    try {
      const workspaces = await fetchWorkspaces();
      if (workspaces && workspaces.length > 0 && workspaces[0].slug) {
        targetSlug = workspaces[0].slug;
      }
    } catch {
      targetSlug = 'production-studio';
    }
  }

  return <WorkspaceShell slug={targetSlug || 'production-studio'} />;
}
