/**
 * Blood on the Clocktower Token Generator
 * GitHub Release Client Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSyncError, GitHubAPIError } from '@/ts/errors.js';
import { GitHubReleaseClient } from '@/ts/sync/githubReleaseClient.js';
import type { GitHubRelease } from '@/ts/types/index.js';

// Mock release data
const mockRelease: GitHubRelease = {
  tag_name: 'v2025.12.03-r6',
  name: 'Official Data Release v2025.12.03-r6',
  published_at: '2025-12-03T12:00:00Z',
  body: 'Release notes here',
  assets: [
    {
      name: 'official-data-sync-v2025.12.03-r6.zip',
      url: 'https://api.github.com/repos/test/releases/assets/123',
      browser_download_url: 'https://github.com/test/releases/download/v2025.12.03-r6/package.zip',
      size: 1024000,
      content_type: 'application/zip',
    },
  ],
};

describe('GitHubReleaseClient', () => {
  let client: GitHubReleaseClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new GitHubReleaseClient();
    client.clearCache();

    // Mock global fetch
    fetchSpy = vi.fn();
    global.fetch = fetchSpy;
  });

  describe('fetchLatestRelease', () => {
    it('should fetch latest release successfully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          ETag: '"abc123"',
        }),
        json: async () => mockRelease,
      });

      const release = await client.fetchLatestRelease();

      expect(release).toEqual(mockRelease);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should use ETag for conditional requests', async () => {
      // First request - get data
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          ETag: '"abc123"',
        }),
        json: async () => mockRelease,
      });

      await client.fetchLatestRelease();

      // Second request - should use ETag
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 304, // Not Modified
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
      });

      const release = await client.fetchLatestRelease();

      expect(release).toEqual(mockRelease);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Check that second request included If-None-Match header
      const secondCallHeaders = fetchSpy.mock.calls[1][1]?.headers;
      expect(secondCallHeaders['If-None-Match']).toBe('"abc123"');
    });

    it('should handle rate limiting', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Used': '60',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 1800),
        }),
      });

      const promise = client.fetchLatestRelease();
      await expect(promise).rejects.toThrow(GitHubAPIError);
      await expect(promise).rejects.toThrow(/rate limit/i);
    }, 10000); // 10 second timeout for retry logic

    it('should retry on network errors', async () => {
      // First two attempts fail
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '59',
            'X-RateLimit-Used': '1',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          }),
          json: async () => mockRelease,
        });

      const release = await client.fetchLatestRelease();

      expect(release).toEqual(mockRelease);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout for retry logic

    it('should throw after max retries', async () => {
      // All attempts fail
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(client.fetchLatestRelease()).rejects.toThrow(DataSyncError);
      expect(fetchSpy).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 15000); // 15 second timeout for max retries

    it('should force refresh when requested', async () => {
      // First request
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          ETag: '"abc123"',
        }),
        json: async () => mockRelease,
      });

      await client.fetchLatestRelease();

      // Second request with forceRefresh - should not use ETag
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '58',
          'X-RateLimit-Used': '2',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          ETag: '"def456"',
        }),
        json: async () => mockRelease,
      });

      await client.fetchLatestRelease(true);

      // Check that second request did NOT include If-None-Match header
      const secondCallHeaders = fetchSpy.mock.calls[1][1]?.headers;
      expect(secondCallHeaders['If-None-Match']).toBeUndefined();
    });
  });

  describe('downloadAsset', () => {
    const mockAsset = mockRelease.assets[0];

    it('should download asset successfully', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/zip' });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        blob: async () => mockBlob,
      });

      const blob = await client.downloadAsset(mockAsset);

      expect(blob).toEqual(mockBlob);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle download errors', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        statusText: 'Not Found',
      });

      await expect(client.downloadAsset(mockAsset)).rejects.toThrow(GitHubAPIError);
    });
  });

  describe('findZipAsset', () => {
    it('should find ZIP asset by default pattern', () => {
      const asset = client.findZipAsset(mockRelease);
      expect(asset).toEqual(mockRelease.assets[0]);
    });

    it('should find ZIP asset by custom pattern', () => {
      const asset = client.findZipAsset(mockRelease, 'official-data');
      expect(asset).toEqual(mockRelease.assets[0]);
    });

    it('should return null when no matching asset found', () => {
      const asset = client.findZipAsset(mockRelease, 'nonexistent');
      expect(asset).toBeNull();
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return null before any requests', () => {
      const info = client.getRateLimitInfo();
      expect(info).toBeNull();
    });

    it('should return rate limit info after request', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '42',
          'X-RateLimit-Used': '18',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 1800),
        }),
        json: async () => mockRelease,
      });

      await client.fetchLatestRelease();

      const info = client.getRateLimitInfo();
      expect(info).toBeDefined();
      expect(info?.limit).toBe(60);
      expect(info?.remaining).toBe(42);
      expect(info?.used).toBe(18);
    });
  });

  describe('clearCache', () => {
    it('should clear ETag cache', async () => {
      // First request
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '59',
          'X-RateLimit-Used': '1',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
          ETag: '"abc123"',
        }),
        json: async () => mockRelease,
      });

      await client.fetchLatestRelease();

      // Clear cache
      client.clearCache();

      // Second request should not use ETag
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '58',
          'X-RateLimit-Used': '2',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: async () => mockRelease,
      });

      await client.fetchLatestRelease();

      const secondCallHeaders = fetchSpy.mock.calls[1][1]?.headers;
      expect(secondCallHeaders['If-None-Match']).toBeUndefined();
    });
  });
});
