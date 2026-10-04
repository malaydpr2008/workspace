import { WorkspaceShell } from '@/components/WorkspaceShell';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function WorkspacesSlugPage({ params }: PageProps) {
  const { slug } = await params;
  return <WorkspaceShell slug={slug} />;
}
