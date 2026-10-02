workspace/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── AGENT_INSTRUCTIONS.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── core/
│       ├── __init__.py
│       ├── admin.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── tests/
│           ├── __init__.py
│           └── test_nodes.py
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── [workspaceSlug]/
        │       └── node/
        │           └── [nodeId]/
        │               └── page.tsx
        ├── components/
        │   ├── NodeDispatcher.tsx
        │   ├── editors/
        │   │   ├── ScreenplayEditor.tsx
        │   │   ├── StoryEditor.tsx
        │   │   └── ArticleEditor.tsx
        │   └── tree/
        │       └── WorkspaceSidebar.tsx
        ├── types/
        │   └── workspace.ts
        └── lib/
            └── api.ts