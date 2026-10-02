import { WorkspaceShell } from '@/components/WorkspaceShell';

interface PageProps {
  params: Promise<{
    workspaceSlug: string;
  }>;
}

export default async function WorkspaceSlugPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  return <WorkspaceShell slug={workspaceSlug} />;
}
