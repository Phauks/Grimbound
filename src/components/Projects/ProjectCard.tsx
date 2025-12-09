/**
 * Project Card Component
 *
 * Displays a project card with thumbnail, metadata, and action buttons.
 * Supports both grid and list layouts.
 */

import type { Project } from '../../ts/types/project.js';

interface ProjectCardProps {
  project: Project;
  layout?: 'grid' | 'list';
  onOpen?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onExport?: (project: Project) => void;
}

export function ProjectCard({
  project,
  layout = 'grid',
  onOpen,
  onDelete,
  onExport,
}: ProjectCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  if (layout === 'list') {
    return (
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => onOpen?.(project)}
      >
        {/* Thumbnail */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
          }}
        >
          {/* Thumbnail placeholder */}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              marginBottom: '4px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {project.name}
          </h3>
          {project.description && (
            <p
              style={{
                margin: 0,
                marginBottom: '8px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span>{project.stats.characterCount} characters</span>
            <span>•</span>
            <span>Modified {formatDate(project.lastModifiedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport?.(project);
            }}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Export
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(project);
            }}
            style={{
              padding: '8px 16px',
              background: '#ffebee',
              color: '#d32f2f',
              border: '1px solid #ffcdd2',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => onOpen?.(project)}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          borderRadius: '8px',
          background: 'var(--bg-secondary)',
          marginBottom: '12px',
        }}
      >
        {/* Thumbnail placeholder */}
      </div>

      {/* Title */}
      <h3
        style={{
          margin: 0,
          marginBottom: '4px',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {project.name}
      </h3>

      {/* Description */}
      {project.description && (
        <p
          style={{
            margin: 0,
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
          }}
        >
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        <div>{project.stats.characterCount} characters</div>
        <div>Modified {formatDate(project.lastModifiedAt)}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExport?.(project);
          }}
          style={{
            flex: 1,
            padding: '8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Export
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(project);
          }}
          style={{
            padding: '8px',
            background: '#ffebee',
            color: '#d32f2f',
            border: '1px solid #ffcdd2',
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
