import Link from "next/link";
import type { ReactNode } from "react";
import type { PostMeta } from "@/lib/posts";

type TreeNode = {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  childOrder: string[];
  post?: PostMeta;
};

function createNode(name: string, path: string): TreeNode {
  return {
    name,
    path,
    children: new Map(),
    childOrder: [],
  };
}

function buildTree(posts: PostMeta[]): TreeNode {
  const root = createNode("root", "");

  for (const post of posts) {
    let current = root;
    let currentPath = "";

    post.slug.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!current.children.has(segment)) {
        current.children.set(segment, createNode(segment, currentPath));
        current.childOrder.push(segment);
      }

      current = current.children.get(segment)!;

      if (index === post.slug.length - 1) {
        current.post = post;
      }
    });
  }

  return root;
}

function hasActiveDescendant(node: TreeNode, currentSlug: string): boolean {
  if (node.post?.slugAsPath === currentSlug) return true;

  for (const key of node.childOrder) {
    const child = node.children.get(key);
    if (child && hasActiveDescendant(child, currentSlug)) return true;
  }

  return false;
}

function orderedChildren(node: TreeNode): TreeNode[] {
  return node.childOrder
    .map((key) => node.children.get(key))
    .filter(Boolean) as TreeNode[];
}

function renderNodes(
  nodes: TreeNode[],
  currentSlug: string,
  level = 0
): ReactNode {
  return (
    <ul className={level === 0 ? "sidebar-list" : "sidebar-children"}>
      {nodes.map((node) => {
        const isLeaf = node.children.size === 0 && node.post;
        const active = node.post?.slugAsPath === currentSlug;
        const open = hasActiveDescendant(node, currentSlug);

        if (isLeaf) {
          return (
            <li key={node.path}>
              <Link
                href={`/docs/${node.post!.slugAsPath}/`}
                prefetch={false}
                className={active ? "active" : ""}
                title={node.post!.title}
                aria-current={active ? "page" : undefined}
              >
                <span className="sidebar-link-text">{node.post!.title}</span>
              </Link>
            </li>
          );
        }

        return (
          <li key={node.path} className="sidebar-accordion">
            <details className="sidebar-details" open={open}>
              <summary className="sidebar-summary">
                <span className="sidebar-summary-label" title={node.name}>
                  {node.name}
                </span>
                <span className="sidebar-summary-icon" aria-hidden />
              </summary>

              {renderNodes(orderedChildren(node), currentSlug, level + 1)}
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function DocsSidebar({
  posts,
  currentSlug,
}: {
  posts: PostMeta[];
  currentSlug: string;
}) {
  const tree = buildTree(posts);
  const rootNodes = orderedChildren(tree);

  return (
    <nav className="sidebar">
      <Link href="/" className="sidebar-back" prefetch={false}>
        ← ホーム
      </Link>

      <p className="sidebar-title">Get started</p>

      {renderNodes(rootNodes, currentSlug)}
    </nav>
  );
}
